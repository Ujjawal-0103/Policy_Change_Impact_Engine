import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AiService } from '../src/ai/ai.service.js';
import { CloudinaryService } from '../src/cloudinary/cloudinary.service.js';
import { ChangeType, ImpactSeverity, ImpactStatus, Priority } from '@prisma/client';

describe('Impact Engine & Multi-Tenant Scoping (e2e)', { timeout: 40000 }, () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tokenA: string;
  let userA: any;
  let tokenB: string;
  let userB: any;

  let policyAId: string;
  let versionA1Id: string;
  let versionA2Id: string;
  let changeAId: string;
  let impactAId: string;

  let policyBId: string;
  let versionB1Id: string;
  let versionB2Id: string;
  let changeBId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AiService)
      .useValue({
        extractRequirements: vi.fn().mockResolvedValue([]),
        comparePolicyVersions: vi.fn().mockResolvedValue([]),
      })
      .overrideProvider(CloudinaryService)
      .useValue({
        uploadPdf: vi.fn().mockResolvedValue({
          url: 'https://cloudinary.test/doc.pdf',
          publicId: 'doc_pub',
        }),
        uploadEvidenceFile: vi.fn().mockResolvedValue({
          url: 'https://cloudinary.test/evidence.pdf',
          publicId: 'ev_pub',
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Clean up test data if left over
    await prisma.user.deleteMany({
      where: { email: { in: ['userA-impact@test.com', 'userB-impact@test.com'] } },
    }).catch(() => {});
    await prisma.organization.deleteMany({
      where: { slug: { in: ['tenant-alpha-impact', 'tenant-beta-impact'] } },
    }).catch(() => {});

    // Register User A
    const regResA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Alice Impact',
        email: 'userA-impact@test.com',
        password: 'Password123!',
        organizationName: 'Tenant Alpha Impact',
        organizationSlug: 'tenant-alpha-impact',
      })
      .expect(201);

    tokenA = regResA.body.accessToken;
    userA = regResA.body.user;

    // Register User B
    const regResB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Bob Impact',
        email: 'userB-impact@test.com',
        password: 'Password123!',
        organizationName: 'Tenant Beta Impact',
        organizationSlug: 'tenant-beta-impact',
      })
      .expect(201);

    tokenB = regResB.body.accessToken;
    userB = regResB.body.user;

    // Setup Tenant A seed records: Document -> Policy -> Version 1 & 2 -> Requirements & Actions -> PolicyChange
    const docA = await prisma.document.create({
      data: {
        title: 'Security Policy V1',
        originalName: 'security_v1.pdf',
        mimeType: 'application/pdf',
        storageUrl: 'https://cloudinary.test/sec_v1.pdf',
        uploadedById: userA.id,
        orgId: userA.orgId,
      },
    });

    const policyA = await prisma.policy.create({
      data: {
        name: 'Information Security Policy',
        description: 'Org Alpha ISMS Policy',
        orgId: userA.orgId,
      },
    });
    policyAId = policyA.id;

    const versionA1 = await prisma.policyVersion.create({
      data: {
        policyId: policyA.id,
        versionNumber: 1,
        documentId: docA.id,
      },
    });
    versionA1Id = versionA1.id;

    const versionA2 = await prisma.policyVersion.create({
      data: {
        policyId: policyA.id,
        versionNumber: 2,
        documentId: docA.id,
      },
    });
    versionA2Id = versionA2.id;

    const reqA1 = await prisma.requirement.create({
      data: {
        policyVersionId: versionA1.id,
        title: 'Access Control Reviews',
        description: 'Conduct quarterly access control audits',
        priority: Priority.HIGH,
        responsibleRole: 'SecOps Lead',
        evidenceNeeded: 'Audit sign-off sheet',
      },
    });

    const actA1 = await prisma.action.create({
      data: {
        requirementId: reqA1.id,
        title: 'Perform User Access Audit',
        description: 'Audit all active IAM user accounts',
        priority: Priority.HIGH,
        department: 'Security',
        assignedToId: userA.id,
        status: 'PENDING',
      },
    });

    const changeA = await prisma.policyChange.create({
      data: {
        policyId: policyA.id,
        fromVersionId: versionA1.id,
        toVersionId: versionA2.id,
        changeType: ChangeType.MODIFIED,
        fieldChanged: 'DEADLINE',
        description: 'Access control reviews changed from quarterly to monthly',
        affectedSection: 'Access Control',
        oldValue: 'Quarterly reviews',
        newValue: 'Monthly reviews',
      },
    });
    changeAId = changeA.id;

    // Setup Tenant B seed records
    const docB = await prisma.document.create({
      data: {
        title: 'Tenant B Data Policy',
        originalName: 'data_b.pdf',
        mimeType: 'application/pdf',
        storageUrl: 'https://cloudinary.test/data_b.pdf',
        uploadedById: userB.id,
        orgId: userB.orgId,
      },
    });

    const policyB = await prisma.policy.create({
      data: {
        name: 'Beta Data Privacy Policy',
        orgId: userB.orgId,
      },
    });
    policyBId = policyB.id;

    const versionB1 = await prisma.policyVersion.create({
      data: { policyId: policyB.id, versionNumber: 1, documentId: docB.id },
    });
    versionB1Id = versionB1.id;

    const versionB2 = await prisma.policyVersion.create({
      data: { policyId: policyB.id, versionNumber: 2, documentId: docB.id },
    });
    versionB2Id = versionB2.id;

    const changeB = await prisma.policyChange.create({
      data: {
        policyId: policyB.id,
        fromVersionId: versionB1.id,
        toVersionId: versionB2.id,
        changeType: ChangeType.ADDED,
        fieldChanged: 'REQUIREMENT',
        description: 'Tenant B mandatory data retention rule',
      },
    });
    changeBId = changeB.id;
  }, 40000);

  afterAll(async () => {
    if (userA?.orgId) {
      await prisma.impact.deleteMany({
        where: { policyChange: { policy: { orgId: userA.orgId } } },
      }).catch(() => {});
      await prisma.policyChange.deleteMany({
        where: { policy: { orgId: userA.orgId } },
      }).catch(() => {});
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
      await prisma.impact.deleteMany({
        where: { policyChange: { policy: { orgId: userB.orgId } } },
      }).catch(() => {});
      await prisma.policyChange.deleteMany({
        where: { policy: { orgId: userB.orgId } },
      }).catch(() => {});
      await prisma.policyVersion.deleteMany({
        where: { policy: { orgId: userB.orgId } },
      }).catch(() => {});
      await prisma.policy.deleteMany({
        where: { orgId: userB.orgId },
      }).catch(() => {});
      await prisma.document.deleteMany({
        where: { orgId: userB.orgId },
      }).catch(() => {});
      await prisma.user.deleteMany({
        where: { orgId: userB.orgId },
      }).catch(() => {});
      await prisma.organization.deleteMany({
        where: { id: userB.orgId },
      }).catch(() => {});
    }

    await app.close();
  }, 40000);

  describe('1 & 2. Authentication and Authorization Guard Checks', () => {
    it('rejects unauthenticated requests to GET /impact with 401', async () => {
      await request(app.getHttpServer()).get('/impact').expect(401);
    });

    it('rejects unauthenticated requests to GET /impact/stats with 401', async () => {
      await request(app.getHttpServer()).get('/impact/stats').expect(401);
    });

    it('allows authenticated user to trigger impact analysis', async () => {
      const res = await request(app.getHttpServer())
        .post(`/impact/analyze/change/${changeAId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].policyChangeId).toBe(changeAId);
      expect(res.body[0].severity).toBe(ImpactSeverity.CRITICAL);
      expect(res.body[0].requirement).toBeDefined();
      expect(res.body[0].action).toBeDefined();

      impactAId = res.body[0].id;
    });
  });

  describe('3 & 4. Tenant Scoping and Data Isolation', () => {
    it('Tenant A can view Tenant A impacts', async () => {
      const res = await request(app.getHttpServer())
        .get('/impact')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].policyChange.policy.orgId).toBe(userA.orgId);
    });

    it('Tenant B cannot see Tenant A impacts', async () => {
      const res = await request(app.getHttpServer())
        .get('/impact')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const foundA = res.body.some((imp: any) => imp.id === impactAId);
      expect(foundA).toBe(false);
    });

    it('Tenant B cannot access Tenant A impact by ID (returns 404)', async () => {
      await request(app.getHttpServer())
        .get(`/impact/${impactAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });
  });

  describe('5 & 6. Cross-Tenant Modification and Analysis Blocked', () => {
    it('Tenant B cannot update Tenant A impact status (returns 404)', async () => {
      await request(app.getHttpServer())
        .patch(`/impact/${impactAId}/status`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ status: ImpactStatus.MITIGATED })
        .expect(404);
    });

    it('Tenant B cannot run impact analysis on Tenant A policy change (returns 404)', async () => {
      await request(app.getHttpServer())
        .post(`/impact/analyze/change/${changeAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });
  });

  describe('7 & 8. Status Update and Duplicate Prevention / Idempotency', () => {
    it('Tenant A can update impact status to MITIGATED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/impact/${impactAId}/status`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ status: ImpactStatus.MITIGATED })
        .expect(200);

      expect(res.body.status).toBe(ImpactStatus.MITIGATED);
    });

    it('Re-running analysis on PolicyChange does not create uncontrolled duplicates and preserves MITIGATED status', async () => {
      const res = await request(app.getHttpServer())
        .post(`/impact/analyze/change/${changeAId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.length).toBe(1);
      expect(res.body[0].status).toBe(ImpactStatus.MITIGATED);
    });

    it('GET /impact/stats computes organization metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/impact/stats')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.byStatus.mitigated).toBeGreaterThanOrEqual(1);
    });
  });
});
