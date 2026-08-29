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

  beforeEach(() => {
    prismaMock = {
      organization: {
        findUnique: vi.fn().mockResolvedValue({ id: 'org-123', name: 'Default Org' }),
        findFirst: vi.fn().mockResolvedValue({ id: 'org-123', name: 'Default Org' }),
        create: vi.fn().mockResolvedValue({ id: 'org-123', name: 'Default Org' }),
      },
      policy: {
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'pol-1', ...data, createdAt: new Date(), updatedAt: new Date() }),
        ),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
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
    it('creates a basic policy without initial document', async () => {
      prismaMock.policy.findUnique.mockResolvedValueOnce({
        id: 'pol-1',
        name: 'Information Security Policy',
        description: 'Sec policy',
        orgId: 'org-123',
        versions: [],
        changes: [],
        _count: { versions: 0, changes: 0 },
      });

      const result = await service.create({
        name: 'Information Security Policy',
        description: 'Sec policy',
      });

      expect(prismaMock.policy.create).toHaveBeenCalledWith({
        data: {
          name: 'Information Security Policy',
          description: 'Sec policy',
          orgId: 'org-123',
        },
      });
      expect(result).toBeDefined();
    });

    it('creates policy and attaches document as version 1 with requirement extraction', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 'doc-1',
        title: 'InfoSec Policy v1.pdf',
        pages: [{ pageNumber: 1, content: 'Obligation 1 text' }],
      });

      prismaMock.policy.findUnique.mockResolvedValueOnce({
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

      const result = await service.create({
        name: 'InfoSec Policy',
        documentId: 'doc-1',
      });

      expect(prismaMock.policyVersion.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('createVersion', () => {
    it('creates a sequential new version (v2) preserving previous versions', async () => {
      prismaMock.policy.findUnique.mockResolvedValueOnce({
        id: 'pol-1',
        name: 'InfoSec Policy',
        versions: [
          { id: 'ver-1', versionNumber: 1, status: PolicyVersionStatus.ACTIVE },
        ],
      });

      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 'doc-2',
        title: 'InfoSec Policy v2.pdf',
        pages: [{ pageNumber: 1, content: 'Updated content' }],
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

      const newVer = await service.createVersion('pol-1', {
        documentId: 'doc-2',
        status: PolicyVersionStatus.ACTIVE,
        autoExtractRequirements: false,
      });

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

    it('throws NotFoundException if policy does not exist', async () => {
      prismaMock.policy.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.createVersion('non-existent', { documentId: 'doc-1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateVersionStatus', () => {
    it('promotes DRAFT version to ACTIVE and archives previous ACTIVE versions', async () => {
      prismaMock.policy.findUnique.mockResolvedValueOnce({
        id: 'pol-1',
        name: 'InfoSec Policy',
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
      prismaMock.policy.findUnique.mockResolvedValueOnce({
        id: 'pol-1',
        name: 'InfoSec Policy',
      });
      prismaMock.policyVersion.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateVersionStatus('pol-1', 'ver-999', PolicyVersionStatus.ACTIVE),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('compareVersions', () => {
    it('compares two distinct versions, saves detected changes, and returns summary stats', async () => {
      prismaMock.policyVersion.findUnique
        .mockResolvedValueOnce({
          id: 'ver-1',
          versionNumber: 1,
          policyId: 'pol-1',
          status: PolicyVersionStatus.ACTIVE,
          policy: { name: 'InfoSec Policy' },
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
          policy: { name: 'InfoSec Policy' },
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

      const result = await service.compareVersions({
        fromVersionId: 'ver-1',
        toVersionId: 'ver-2',
      });

      expect(result.summary.totalChanges).toBe(2);
      expect(result.summary.modifiedCount).toBe(2);
      expect(result.summary.deadlineChangesCount).toBe(1);
      expect(prismaMock.policyChange.create).toHaveBeenCalledTimes(2);
    });

    it('throws BadRequestException if comparing a version to itself', async () => {
      prismaMock.policyVersion.findUnique
        .mockResolvedValueOnce({ id: 'ver-1', policyId: 'pol-1' })
        .mockResolvedValueOnce({ id: 'ver-1', policyId: 'pol-1' });

      await expect(
        service.compareVersions({
          fromVersionId: 'ver-1',
          toVersionId: 'ver-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
