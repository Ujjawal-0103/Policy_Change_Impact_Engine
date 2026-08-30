import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PoliciesService } from './policies.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AiService } from '../ai/ai.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PolicyVersionStatus, ChangeType } from '@prisma/client';

describe('PoliciesService', () => {
  let service: PoliciesService;
  let prismaMock: any;
  let aiServiceMock: any;
  const mockOrgId = 'org-123';

  beforeEach(() => {
    prismaMock = {
      organization: {
        findUnique: vi.fn().mockResolvedValue({ id: mockOrgId, name: 'Default Org' }),
        findFirst: vi.fn().mockResolvedValue({ id: mockOrgId, name: 'Default Org' }),
        create: vi.fn().mockResolvedValue({ id: mockOrgId, name: 'Default Org' }),
      },
      policy: {
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'pol-1', ...data, createdAt: new Date(), updatedAt: new Date() }),
        ),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({ id: where.id, ...data }),
        ),
      },
      policyVersion: {
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: `ver-${data.versionNumber}`, ...data, createdAt: new Date() }),
        ),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({ id: where.id, ...data }),
        ),
      },
      document: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      requirement: {
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'req-1', ...data, createdAt: new Date() }),
        ),
        findMany: vi.fn().mockResolvedValue([]),
      },
      policyChange: {
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'change-1', ...data, createdAt: new Date() }),
        ),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };

    aiServiceMock = {
      extractRequirements: vi.fn().mockResolvedValue([]),
      comparePolicyVersions: vi.fn().mockResolvedValue([]),
    };

    service = new PoliciesService(
      prismaMock as unknown as PrismaService,
      aiServiceMock as unknown as AiService,
    );
  });

  describe('createPolicy', () => {
    it('creates a basic policy scoped to organization', async () => {
      prismaMock.policy.findFirst.mockResolvedValueOnce({
        id: 'pol-1',
        name: 'Information Security Policy',
        description: 'Sec policy',
        orgId: mockOrgId,
        versions: [],
        changes: [],
        _count: { versions: 0, changes: 0 },
      });

      const result = await service.create(
        {
          name: 'Information Security Policy',
          description: 'Sec policy',
        },
        mockOrgId,
      );

      expect(prismaMock.policy.create).toHaveBeenCalledWith({
        data: {
          name: 'Information Security Policy',
          description: 'Sec policy',
          orgId: mockOrgId,
        },
      });
      expect(result).toBeDefined();
    });

    it('creates policy and attaches document as version 1 with requirement extraction', async () => {
      prismaMock.document.findFirst.mockResolvedValueOnce({
        id: 'doc-1',
        title: 'InfoSec Policy v1.pdf',
        orgId: mockOrgId,
      });

      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 'doc-1',
        title: 'InfoSec Policy v1.pdf',
        pages: [{ pageNumber: 1, content: 'Obligation 1 text' }],
      });

      prismaMock.policy.findFirst.mockResolvedValueOnce({
        id: 'pol-1',
        name: 'InfoSec Policy',
        versions: [
          {
            id: 'ver-1',
            versionNumber: 1,
            status: PolicyVersionStatus.ACTIVE,
            document: { id: 'doc-1', title: 'InfoSec Policy v1.pdf' },
            requirements: [],
          },
        ],
        changes: [],
        _count: { versions: 1, changes: 0 },
      });

      aiServiceMock.extractRequirements.mockResolvedValueOnce([
        {
          title: 'Encryption',
          description: 'Encrypt everything',
          priority: 'HIGH',
          deadline: '2026-12-31',
          sourcePage: 1,
          sourceText: 'Encrypt data',
        },
      ]);

      const result = await service.create(
        {
          name: 'InfoSec Policy',
          documentId: 'doc-1',
        },
        mockOrgId,
      );

      expect(prismaMock.policyVersion.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('createVersion', () => {
    it('creates a sequential new version (v2) preserving previous versions', async () => {
      prismaMock.policy.findFirst.mockResolvedValueOnce({
        id: 'pol-1',
        name: 'InfoSec Policy',
        orgId: mockOrgId,
        versions: [
          { id: 'ver-1', versionNumber: 1, status: PolicyVersionStatus.ACTIVE },
        ],
      });

      prismaMock.document.findFirst.mockResolvedValueOnce({
        id: 'doc-2',
        title: 'InfoSec Policy v2.pdf',
        orgId: mockOrgId,
      });

      prismaMock.policyVersion.findUnique.mockResolvedValueOnce({
        id: 'ver-2',
        policyId: 'pol-1',
        versionNumber: 2,
        documentId: 'doc-2',
        status: PolicyVersionStatus.ACTIVE,
        requirements: [],
        _count: { requirements: 0 },
      });

      const newVer = await service.createVersion(
        'pol-1',
        {
          documentId: 'doc-2',
          status: PolicyVersionStatus.ACTIVE,
          autoExtractRequirements: false,
        },
        mockOrgId,
      );

      expect(prismaMock.policyVersion.create).toHaveBeenCalledWith({
        data: {
          policyId: 'pol-1',
          versionNumber: 2,
          documentId: 'doc-2',
          status: PolicyVersionStatus.ACTIVE,
        },
        include: { document: true },
      });
      expect(newVer?.versionNumber).toBe(2);
    });

    it('throws NotFoundException if policy does not exist in organization', async () => {
      prismaMock.policy.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.createVersion('non-existent', { documentId: 'doc-1' }, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateVersionStatus', () => {
    it('promotes DRAFT version to ACTIVE and archives previous ACTIVE versions', async () => {
      prismaMock.policy.findFirst.mockResolvedValueOnce({
        id: 'pol-1',
        name: 'InfoSec Policy',
        orgId: mockOrgId,
      });

      prismaMock.policyVersion.findFirst.mockResolvedValueOnce({
        id: 'ver-2',
        policyId: 'pol-1',
        versionNumber: 2,
        status: PolicyVersionStatus.DRAFT,
      });

      prismaMock.policyVersion.update.mockResolvedValueOnce({
        id: 'ver-2',
        policyId: 'pol-1',
        versionNumber: 2,
        status: PolicyVersionStatus.ACTIVE,
        document: { id: 'doc-2' },
        requirements: [],
        _count: { requirements: 0 },
      });

      const updated = await service.updateVersionStatus(
        'pol-1',
        'ver-2',
        PolicyVersionStatus.ACTIVE,
        mockOrgId,
      );

      expect(prismaMock.policyVersion.updateMany).toHaveBeenCalledWith({
        where: {
          policyId: 'pol-1',
          id: { not: 'ver-2' },
          status: PolicyVersionStatus.ACTIVE,
        },
        data: {
          status: PolicyVersionStatus.ARCHIVED,
        },
      });
      expect(updated.status).toBe(PolicyVersionStatus.ACTIVE);
    });

    it('throws NotFoundException if version not found for policy', async () => {
      prismaMock.policy.findFirst.mockResolvedValueOnce({
        id: 'pol-1',
        name: 'InfoSec Policy',
        orgId: mockOrgId,
      });
      prismaMock.policyVersion.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateVersionStatus('pol-1', 'ver-999', PolicyVersionStatus.ACTIVE, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('compareVersions', () => {
    it('compares two distinct versions, saves detected changes, and returns summary stats', async () => {
      prismaMock.policyVersion.findFirst
        .mockResolvedValueOnce({
          id: 'ver-1',
          versionNumber: 1,
          policyId: 'pol-1',
          status: PolicyVersionStatus.ACTIVE,
          policy: { name: 'InfoSec Policy', orgId: mockOrgId },
          document: { id: 'doc-1', title: 'v1.pdf', pages: [] },
          requirements: [
            {
              id: 'req-1',
              title: 'Access Control',
              description: 'Use passwords',
              priority: 'MEDIUM',
              deadline: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          id: 'ver-2',
          versionNumber: 2,
          policyId: 'pol-1',
          status: PolicyVersionStatus.ACTIVE,
          policy: { name: 'InfoSec Policy', orgId: mockOrgId },
          document: { id: 'doc-2', title: 'v2.pdf', pages: [] },
          requirements: [
            {
              id: 'req-2',
              title: 'Access Control',
              description: 'Use MFA and biometric auth',
              priority: 'HIGH',
              deadline: '2026-12-31',
            },
          ],
        });

      aiServiceMock.comparePolicyVersions.mockResolvedValueOnce([
        {
          changeType: 'MODIFIED',
          fieldChanged: 'REQUIREMENT',
          description: 'Upgraded access control to mandatory MFA.',
          affectedSection: 'Access Control',
          oldValue: 'Use passwords',
          newValue: 'Use MFA and biometric auth',
          sourceReference: 'v2 Page 1: "Use MFA and biometric auth"',
          confidence: 0.95,
          severity: 'HIGH',
        },
        {
          changeType: 'MODIFIED',
          fieldChanged: 'DEADLINE',
          description: 'Added compliance deadline 2026-12-31.',
          affectedSection: 'Access Control',
          oldValue: null,
          newValue: '2026-12-31',
          sourceReference: 'v2 Page 1',
          confidence: 0.95,
          severity: 'HIGH',
        },
      ]);

      const result = await service.compareVersions(
        {
          fromVersionId: 'ver-1',
          toVersionId: 'ver-2',
        },
        mockOrgId,
      );

      expect(result.summary.totalChanges).toBe(2);
      expect(result.summary.modifiedCount).toBe(2);
      expect(result.summary.deadlineChangesCount).toBe(1);
      expect(prismaMock.policyChange.create).toHaveBeenCalledTimes(2);
    });

    it('throws BadRequestException if comparing a version to itself', async () => {
      prismaMock.policyVersion.findFirst
        .mockResolvedValueOnce({ id: 'ver-1', policyId: 'pol-1', policy: { orgId: mockOrgId } })
        .mockResolvedValueOnce({ id: 'ver-1', policyId: 'pol-1', policy: { orgId: mockOrgId } });

      await expect(
        service.compareVersions(
          {
            fromVersionId: 'ver-1',
            toVersionId: 'ver-1',
          },
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getChanges & getChangeById', () => {
    it('retrieves changes with enriched impact, requirement, and action traceability', async () => {
      prismaMock.policy.findFirst.mockResolvedValueOnce({
        id: 'pol-1',
        name: 'InfoSec Policy',
        orgId: mockOrgId,
      });

      const mockChangeWithTraceability = {
        id: 'change-1',
        policyId: 'pol-1',
        fromVersionId: 'ver-1',
        toVersionId: 'ver-2',
        changeType: ChangeType.MODIFIED,
        fieldChanged: 'DEADLINE',
        description: 'MFA deadline changed from 30 days to 7 days',
        affectedSection: 'Section 4.1',
        oldValue: '30 days',
        newValue: '7 days',
        sourceReference: 'Page 2',
        impacts: [
          {
            id: 'imp-1',
            severity: 'HIGH',
            status: 'IDENTIFIED',
            description: 'Action Impact: Deploy MFA Tokens',
            reason: 'Deadline shortened from 30 to 7 days',
            requirement: {
              id: 'req-1',
              title: 'MFA Enforcement',
              sourcePage: 2,
              sourceText: 'All administrators must use MFA within 7 days.',
            },
            action: {
              id: 'act-1',
              title: 'Deploy Hardware MFA Tokens',
              department: 'IT Security',
              assignedTo: { id: 'usr-1', name: 'Alice Admin', email: 'alice@example.com' },
              evidence: [{ id: 'ev-1', title: 'MFA Audit Log', fileUrl: 'https://example.com/log.pdf' }],
            },
          },
        ],
      };

      prismaMock.policyChange.findMany.mockResolvedValueOnce([mockChangeWithTraceability]);

      const changes = await service.getChanges('pol-1', 'ver-1', 'ver-2', mockOrgId);

      expect(changes).toHaveLength(1);
      expect(changes[0].impacts[0]?.requirement?.sourceText).toBe(
        'All administrators must use MFA within 7 days.',
      );
      expect(changes[0].impacts[0]?.action?.assignedTo?.name).toBe('Alice Admin');
      expect(changes[0].impacts[0]?.action?.evidence).toHaveLength(1);
    });

    it('getChangeById returns single change with full nested traceability', async () => {
      const mockChange = {
        id: 'change-1',
        policyId: 'pol-1',
        policy: { id: 'pol-1', name: 'InfoSec Policy', orgId: mockOrgId },
        impacts: [
          {
            id: 'imp-1',
            requirement: { id: 'req-1', title: 'MFA' },
            action: { id: 'act-1', title: 'Deploy MFA' },
          },
        ],
      };

      prismaMock.policyChange.findFirst.mockResolvedValueOnce(mockChange);

      const change = await service.getChangeById('change-1', mockOrgId);
      expect(change.id).toBe('change-1');
      expect(change.impacts[0]?.action?.title).toBe('Deploy MFA');
    });
  });
});
