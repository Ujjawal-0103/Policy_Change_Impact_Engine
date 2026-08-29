import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AiService } from '../src/ai/ai.service.js';
import { CloudinaryService } from '../src/cloudinary/cloudinary.service.js';

const VALID_PDF_BUFFER = Buffer.from(
  `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 35 >>
stream
BT
/F1 12 Tf
72 712 Td
(Tenant A Confidential) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000229 00000 n 
0000000318 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
390
%%EOF`,
);

describe('Multi-Tenant Data Isolation (e2e)', { timeout: 40000 }, () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tokenA: string;
  let userA: any;
  let tokenB: string;
  let userB: any;

  let docAId: string;
  let policyAId: string;
  let actionAId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AiService)
      .useValue({
        extractRequirements: vi.fn().mockResolvedValue([
          {
            title: 'Tenant A Requirement',
            description: 'Confidential requirement A',
            priority: 'HIGH',
            deadline: '2026-12-31',
            responsibleRole: 'SecOps',
            sourcePage: 1,
          },
        ]),
        comparePolicyVersions: vi.fn().mockResolvedValue([]),
      })
      .overrideProvider(CloudinaryService)
      .useValue({
        uploadPdf: vi.fn().mockResolvedValue({
          url: 'https://cloudinary.test/docA.pdf',
          publicId: 'docA',
        }),
        uploadEvidenceFile: vi.fn().mockResolvedValue({
          url: 'https://cloudinary.test/evidence.pdf',
          publicId: 'evA',
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Clean up any existing test records
    await prisma.user.deleteMany({
      where: { email: { in: ['userA-isolation@test.com', 'userB-isolation@test.com'] } },
    });
    await prisma.organization.deleteMany({
      where: { slug: { in: ['tenant-alpha-isolation', 'tenant-beta-isolation'] } },
    });

    // 1. Register User A in Tenant Alpha
    const regResA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Alice Alpha',
        email: 'userA-isolation@test.com',
        password: 'Password123!',
        organizationName: 'Tenant Alpha Isolation',
        organizationSlug: 'tenant-alpha-isolation',
      })
      .expect(201);

    tokenA = regResA.body.accessToken;
    userA = regResA.body.user;

    // 2. Register User B in Tenant Beta
    const regResB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Bob Beta',
        email: 'userB-isolation@test.com',
        password: 'Password123!',
        organizationName: 'Tenant Beta Isolation',
        organizationSlug: 'tenant-beta-isolation',
      })
      .expect(201);

    tokenB = regResB.body.accessToken;
    userB = regResB.body.user;
  }, 40000);

  afterAll(async () => {
    // Teardown test organizations and users
    if (userA?.orgId) {
      await prisma.action.deleteMany({
        where: { requirement: { policyVersion: { policy: { orgId: userA.orgId } } } },
      }).catch(() => {});
      await prisma.requirement.deleteMany({
        where: { policyVersion: { policy: { orgId: userA.orgId } } },
      }).catch(() => {});
      await prisma.policyVersion.deleteMany({
        where: { policy: { orgId: userA.orgId } },
      }).catch(() => {});
      await prisma.policy.deleteMany({
        where: { orgId: userA.orgId },
      }).catch(() => {});
      await prisma.documentPage.deleteMany({
        where: { document: { orgId: userA.orgId } },
      }).catch(() => {});
      await prisma.document.deleteMany({
        where: { orgId: userA.orgId },
      }).catch(() => {});
      await prisma.user.deleteMany({
        where: { orgId: userA.orgId },
      }).catch(() => {});
      await prisma.organization.deleteMany({
        where: { id: userA.orgId },
      }).catch(() => {});
    }

    if (userB?.orgId) {
      await prisma.user.deleteMany({
        where: { orgId: userB.orgId },
      }).catch(() => {});
      await prisma.organization.deleteMany({
        where: { id: userB.orgId },
      }).catch(() => {});
    }

    await app.close();
  }, 40000);

  describe('Unauthenticated Request Rejection', () => {
    it('rejects GET /documents without Authorization header with 401', async () => {
      await request(app.getHttpServer()).get('/documents').expect(401);
    });

    it('rejects GET /policies without Authorization header with 401', async () => {
      await request(app.getHttpServer()).get('/policies').expect(401);
    });

    it('rejects GET /actions without Authorization header with 401', async () => {
      await request(app.getHttpServer()).get('/actions').expect(401);
    });
  });

  describe('Document Isolation', () => {
    it('User A uploads Document A', async () => {
      const uploadRes = await request(app.getHttpServer())
        .post('/documents/upload')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('file', VALID_PDF_BUFFER, 'TenantA_Policy.pdf')
        .field('title', 'Confidential Tenant A Document')
        .expect(201);

      docAId = uploadRes.body.id;
      expect(uploadRes.body.orgId).toBe(userA.orgId);
      expect(uploadRes.body.uploadedById).toBe(userA.id);
    });

    it('User A can see Document A in GET /documents', async () => {
      const res = await request(app.getHttpServer())
        .get('/documents')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.some((d: any) => d.id === docAId)).toBe(true);
    });

    it('User B CANNOT see Document A in GET /documents', async () => {
      const res = await request(app.getHttpServer())
        .get('/documents')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body.some((d: any) => d.id === docAId)).toBe(false);
    });

    it('User B receives 404 when trying to access Document A via direct GET /documents/:id', async () => {
      await request(app.getHttpServer())
        .get(`/documents/${docAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });
  });

  describe('Policy & Action Isolation', () => {
    it('User A creates Policy A and Action A', async () => {
      const policyRes = await request(app.getHttpServer())
        .post('/policies')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Tenant Alpha Security Policy',
          documentId: docAId,
        })
        .expect(201);

      policyAId = policyRes.body.id;
      expect(policyRes.body.versions.length).toBeGreaterThan(0);

      const reqId = policyRes.body.versions[0].requirements[0].id;

      const actionRes = await request(app.getHttpServer())
        .post('/actions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          requirementId: reqId,
          title: 'Implement Tenant A Secret Key Rotation',
          department: 'Security',
        })
        .expect(201);

      actionAId = actionRes.body.id;
      expect(actionAId).toBeDefined();
    }, 30000);

    it('User B CANNOT see Policy A in GET /policies', async () => {
      const res = await request(app.getHttpServer())
        .get('/policies')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body.some((p: any) => p.id === policyAId)).toBe(false);
    });

    it('User B receives 404 when trying to access Policy A via direct GET /policies/:id', async () => {
      await request(app.getHttpServer())
        .get(`/policies/${policyAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('User B CANNOT see Action A in GET /actions', async () => {
      const res = await request(app.getHttpServer())
        .get('/actions')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body.some((a: any) => a.id === actionAId)).toBe(false);
    });

    it('User B receives 404 when trying to access Action A via direct GET /actions/:id', async () => {
      await request(app.getHttpServer())
        .get(`/actions/${actionAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('User B gets isolated 0 counts in GET /actions/stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/actions/stats')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body.totalActions).toBe(0);
    });
  });
});
