import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AiService } from '../src/ai/ai.service.js';

describe('Policies Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let testOrgId: string;
  let testDoc1Id: string;
  let testDoc2Id: string;
  let authToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AiService)
      .useValue({
        extractRequirements: vi.fn().mockResolvedValue([
          {
            title: 'Requirement A',
            description: 'Baseline description',
            priority: 'MEDIUM',
            deadline: '2026-06-30',
            responsibleRole: 'SecOps',
            evidenceNeeded: 'Audit Log',
            sourcePage: 1,
            sourceText: 'Baseline text',
            confidence: 0.9,
            needsReview: false,
            suggestedActions: [],
          },
        ]),
        comparePolicyVersions: vi.fn().mockResolvedValue([
          {
            changeType: 'MODIFIED',
            fieldChanged: 'REQUIREMENT',
            description: 'Updated requirement scope.',
            affectedSection: 'Requirement A',
            oldValue: 'Baseline description',
            newValue: 'Revised description',
            sourceReference: 'v2 Page 1',
            confidence: 0.95,
            severity: 'MEDIUM',
          },
          {
            changeType: 'ADDED',
            fieldChanged: 'REQUIREMENT',
            description: 'New mandatory MFA requirement.',
            affectedSection: 'MFA Mandate',
            oldValue: null,
            newValue: 'All users must use MFA.',
            sourceReference: 'v2 Page 2',
            confidence: 0.95,
            severity: 'HIGH',
          },
        ]),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Register test user & organization
    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Policy Test Admin',
        email: `policy-e2e-${Date.now()}@policyengine.local`,
        password: 'Password123!',
        organizationName: 'Policy Test Org',
      });

    authToken = regRes.body.accessToken;
    testOrgId = regRes.body.user.orgId;
    const testUserId = regRes.body.user.id;

    const doc1 = await prisma.document.create({
      data: {
        title: 'Security Policy v1',
        originalName: 'sec_v1.pdf',
        mimeType: 'application/pdf',
        storageUrl: 'https://cloudinary.com/sec_v1.pdf',
        uploadedById: testUserId,
        orgId: testOrgId,
        pages: {
          create: [{ pageNumber: 1, content: 'Baseline security content.' }],
        },
      },
    });
    testDoc1Id = doc1.id;

    const doc2 = await prisma.document.create({
      data: {
        title: 'Security Policy v2',
        originalName: 'sec_v2.pdf',
        mimeType: 'application/pdf',
        storageUrl: 'https://cloudinary.com/sec_v2.pdf',
        uploadedById: testUserId,
        orgId: testOrgId,
        pages: {
          create: [
            { pageNumber: 1, content: 'Revised security content.' },
            { pageNumber: 2, content: 'MFA mandate section.' },
          ],
        },
      },
    });
    testDoc2Id = doc2.id;
  });

  afterEach(async () => {
    if (prisma && testOrgId) {
      await prisma.action.deleteMany({
        where: { requirement: { policyVersion: { policy: { orgId: testOrgId } } } },
      }).catch(() => {});
      await prisma.requirement.deleteMany({
        where: { policyVersion: { policy: { orgId: testOrgId } } },
      }).catch(() => {});
      await prisma.impact.deleteMany({
        where: { policyChange: { policy: { orgId: testOrgId } } },
      }).catch(() => {});
      await prisma.policyChange.deleteMany({
        where: { policy: { orgId: testOrgId } },
      }).catch(() => {});
      await prisma.policyVersion.deleteMany({
        where: { policy: { orgId: testOrgId } },
      }).catch(() => {});
      await prisma.policy.deleteMany({
        where: { orgId: testOrgId },
      }).catch(() => {});
      await prisma.documentPage.deleteMany({
        where: { document: { orgId: testOrgId } },
      }).catch(() => {});
      await prisma.document.deleteMany({
        where: { orgId: testOrgId },
      }).catch(() => {});
      await prisma.user.deleteMany({
        where: { orgId: testOrgId },
      }).catch(() => {});
      await prisma.organization.deleteMany({
        where: { id: testOrgId },
      }).catch(() => {});
    }
    if (app) {
      await app.close();
    }
  });

  it(
    'full policy version comparison lifecycle: create policy -> add version -> compare versions -> get changes',
    async () => {
      // 1. Create a Policy with initial Document (Version 1)
      const createPolicyRes = await request(app.getHttpServer())
        .post('/policies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Enterprise Information Security Policy',
          description: 'Comprehensive cybersecurity guidelines',
          documentId: testDoc1Id,
        })
        .expect(201);

      const policy = createPolicyRes.body;
      expect(policy.id).toBeDefined();
      expect(policy.name).toBe('Enterprise Information Security Policy');
      expect(policy.versions).toHaveLength(1);
      expect(policy.versions[0].versionNumber).toBe(1);

      const version1Id = policy.versions[0].id;

      // 2. Upload / Create Version 2 for this policy
      const createVersionRes = await request(app.getHttpServer())
        .post(`/policies/${policy.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          documentId: testDoc2Id,
          status: 'ACTIVE',
        })
        .expect(201);

      const version2 = createVersionRes.body;
      expect(version2.versionNumber).toBe(2);
      expect(version2.policyId).toBe(policy.id);
      const version2Id = version2.id;

      // 3. List versions
      const listVersionsRes = await request(app.getHttpServer())
        .get(`/policies/${policy.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listVersionsRes.body).toHaveLength(2);
      expect(listVersionsRes.body[0].versionNumber).toBe(2);
      expect(listVersionsRes.body[1].versionNumber).toBe(1);

      // 4. Compare Version 1 and Version 2
      const compareRes = await request(app.getHttpServer())
        .post('/policies/compare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fromVersionId: version1Id,
          toVersionId: version2Id,
          policyId: policy.id,
        })
        .expect(201);

      expect(compareRes.body.policyId).toBe(policy.id);
      expect(compareRes.body.fromVersion.versionNumber).toBe(1);
      expect(compareRes.body.toVersion.versionNumber).toBe(2);
      expect(compareRes.body.summary.totalChanges).toBe(2);
      expect(compareRes.body.changes).toHaveLength(2);

      // Check detected changes structure
      const changes = compareRes.body.changes;
      const addedChange = changes.find((c: any) => c.changeType === 'ADDED');
      expect(addedChange).toBeDefined();
      expect(addedChange.sourceReference).toBe('v2 Page 2');

      // 5. Query saved changes for this policy
      const getChangesRes = await request(app.getHttpServer())
        .get(`/policies/${policy.id}/changes`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getChangesRes.body).toHaveLength(2);
    },
    30000,
  );
});
