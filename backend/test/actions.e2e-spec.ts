import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ActionStatus, Priority } from '@prisma/client';

describe('Actions Module E2E Tests (Sprint 4)', { timeout: 30000 }, () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testRequirementId: string;
  let testActionId: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // Setup prerequisites: Org, User, Doc, Policy, PolicyVersion, Requirement
    const org = await prisma.organization.upsert({
      where: { slug: 'test-actions-org' },
      update: {},
      create: { name: 'Actions Test Org', slug: 'test-actions-org' },
    });

    const user = await prisma.user.upsert({
      where: { email: 'actions-test@policyengine.local' },
      update: {},
      create: {
        name: 'Actions Tester',
        email: 'actions-test@policyengine.local',
        password: 'hashed_password',
        orgId: org.id,
      },
    });

    const doc = await prisma.document.create({
      data: {
        title: 'Actions E2E Test Policy Doc',
        originalName: 'test-doc.pdf',
        mimeType: 'application/pdf',
        storageUrl: 'http://localhost:3001/test.pdf',
        uploadedById: user.id,
        orgId: org.id,
      },
    });

    const policy = await prisma.policy.create({
      data: {
        name: 'Actions E2E Security Policy',
        orgId: org.id,
      },
    });

    const policyVersion = await prisma.policyVersion.create({
      data: {
        policyId: policy.id,
        versionNumber: 1,
        documentId: doc.id,
      },
    });

    const requirement = await prisma.requirement.create({
      data: {
        policyVersionId: policyVersion.id,
        title: 'Mandatory Multi-Factor Authentication',
        description: 'All remote access must require MFA token verification.',
        priority: Priority.HIGH,
        deadline: new Date('2026-12-31'),
      },
    });

    testRequirementId = requirement.id;
  });

  afterEach(async () => {
    if (prisma) {
      await prisma.organization.deleteMany({
        where: { slug: 'test-actions-org' },
      }).catch(() => {});
    }
    if (app) {
      await app.close();
    }
  });

  it('A. POST /actions — successfully creates an Action from a Requirement', async () => {
    const res = await request(app.getHttpServer())
      .post('/actions')
      .send({
        requirementId: testRequirementId,
        title: 'Deploy Duo MFA for Engineering Team',
        description: 'Enroll all 50 engineers into Duo MFA group.',
        priority: 'HIGH',
        department: 'Information Security',
        deadline: '2026-11-30T00:00:00.000Z',
        note: 'Initial assignment from policy mandate',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Deploy Duo MFA for Engineering Team');
    expect(res.body.requirementId).toBe(testRequirementId);
    expect(res.body.priority).toBe('HIGH');
    expect(res.body.department).toBe('Information Security');
    expect(res.body.status).toBe('PENDING');

    testActionId = res.body.id;
  });

  it('B. POST /actions — rejects action creation if requirement does not exist', async () => {
    const res = await request(app.getHttpServer())
      .post('/actions')
      .send({
        requirementId: 'non_existent_req_id_99999',
        title: 'Ghost Action',
      })
      .expect(404);

    expect(res.body.message).toContain('does not exist');
  });

  it('C. GET /actions — retrieves all actions with computed overdue status', async () => {
    // Create an action first
    const createRes = await request(app.getHttpServer())
      .post('/actions')
      .send({
        requirementId: testRequirementId,
        title: 'Test List Action',
        priority: 'MEDIUM',
        department: 'Compliance',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/actions')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const found = res.body.find((a: any) => a.id === createRes.body.id);
    expect(found).toBeDefined();
    expect(found).toHaveProperty('computedStatus');
  });

  it('D. GET /actions/:id — retrieves full action with requirement, evidence, and audit history', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/actions')
      .send({
        requirementId: testRequirementId,
        title: 'Detailed Action Inspection',
        department: 'Legal',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/actions/${createRes.body.id}`)
      .expect(200);

    expect(res.body.id).toBe(createRes.body.id);
    expect(res.body.requirement).toBeDefined();
    expect(res.body.history).toBeDefined();
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(res.body.history.length).toBeGreaterThanOrEqual(1);
    expect(res.body.history[0].field).toBe('status');
  });

  it('E. PATCH /actions/:id/status — changes status and records ActionHistory', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/actions')
      .send({
        requirementId: testRequirementId,
        title: 'Status Transition Test Action',
      })
      .expect(201);

    // Transition to IN_PROGRESS
    const updateRes = await request(app.getHttpServer())
      .patch(`/actions/${createRes.body.id}/status`)
      .send({
        status: 'IN_PROGRESS',
        note: 'Engineering started rollout',
      })
      .expect(200);

    expect(updateRes.body.status).toBe('IN_PROGRESS');

    // Verify ActionHistory entry
    const detailsRes = await request(app.getHttpServer())
      .get(`/actions/${createRes.body.id}`)
      .expect(200);

    const history = detailsRes.body.history;
    const transitionEntry = history.find(
      (h: any) => h.field === 'status' && h.newValue === 'IN_PROGRESS',
    );
    expect(transitionEntry).toBeDefined();
    expect(transitionEntry.oldValue).toBe('PENDING');
    expect(transitionEntry.note).toBe('Engineering started rollout');
  });

  it('F. PATCH /actions/:id/assign — assigns department and owner', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/actions')
      .send({
        requirementId: testRequirementId,
        title: 'Assignment Test Action',
        department: 'General',
      })
      .expect(201);

    const assignRes = await request(app.getHttpServer())
      .patch(`/actions/${createRes.body.id}/assign`)
      .send({
        department: 'IT Infrastructure',
        note: 'Transferred ownership to IT Infrastructure',
      })
      .expect(200);

    expect(assignRes.body.department).toBe('IT Infrastructure');

    // Verify history recorded
    const detailsRes = await request(app.getHttpServer())
      .get(`/actions/${createRes.body.id}`)
      .expect(200);

    const deptHistory = detailsRes.body.history.find(
      (h: any) => h.field === 'department' && h.newValue === 'IT Infrastructure',
    );
    expect(deptHistory).toBeDefined();
  });

  it('G. POST /actions/:id/evidence — attaches compliance evidence to action', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/actions')
      .send({
        requirementId: testRequirementId,
        title: 'Evidence Test Action',
      })
      .expect(201);

    const evidenceRes = await request(app.getHttpServer())
      .post(`/actions/${createRes.body.id}/evidence`)
      .send({
        title: 'Duo MFA Enrollment Screenshot Report',
        description: 'Verified 100% enrollment of 50 active engineers.',
        fileUrl: 'https://res.cloudinary.com/demo/evidence_duo.pdf',
      })
      .expect(201);

    expect(evidenceRes.body).toHaveProperty('id');
    expect(evidenceRes.body.title).toBe('Duo MFA Enrollment Screenshot Report');
    expect(evidenceRes.body.actionId).toBe(createRes.body.id);

    // Verify action details include evidence
    const detailsRes = await request(app.getHttpServer())
      .get(`/actions/${createRes.body.id}`)
      .expect(200);

    expect(detailsRes.body.evidence.length).toBe(1);
    expect(detailsRes.body.evidence[0].title).toBe('Duo MFA Enrollment Screenshot Report');
  }, 20000);

  it('H. GET /actions/stats & Overdue calculation — verifies deterministic KPIs', async () => {
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Create an overdue action (past deadline, not completed)
    await request(app.getHttpServer())
      .post('/actions')
      .send({
        requirementId: testRequirementId,
        title: 'Overdue Mandate Action',
        deadline: pastDate,
        status: 'PENDING',
      })
      .expect(201);

    const statsRes = await request(app.getHttpServer())
      .get('/actions/stats')
      .expect(200);

    expect(statsRes.body).toHaveProperty('totalActions');
    expect(statsRes.body).toHaveProperty('overdue');
    expect(statsRes.body.overdue).toBeGreaterThanOrEqual(1);
    expect(statsRes.body.byPriority).toHaveProperty('HIGH');
  });
});
