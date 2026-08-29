import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ImpactService } from './impact.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ImpactSeverity, ImpactStatus, ChangeType } from '@prisma/client';

describe('ImpactService', () => {
  let service: ImpactService;
  let prisma: PrismaService;
  const mockOrgId = 'org_1';

  const mockPrisma = {
    policyChange: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    impact: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = mockPrisma as unknown as PrismaService;
    service = new ImpactService(prisma);
  });

  describe('getImpacts', () => {
    it('should return existing impacts for a valid policyChangeId in org', async () => {
      const mockChange = {
        id: 'change_1',
        changeType: ChangeType.MODIFIED,
        fieldChanged: 'REQUIREMENT',
        description: 'Updated requirement description',
        policy: { orgId: mockOrgId },
        impacts: [
          {
            id: 'imp_1',
            policyChangeId: 'change_1',
            description: 'Operational impact for requirement modification',
            severity: ImpactSeverity.MEDIUM,
            status: ImpactStatus.IDENTIFIED,
          },
        ],
      };

      mockPrisma.policyChange.findFirst.mockResolvedValue(mockChange);

      const result = await service.getImpacts('change_1', mockOrgId);

      expect(mockPrisma.policyChange.findFirst).toHaveBeenCalledWith({
        where: { id: 'change_1', policy: { orgId: mockOrgId } },
        include: { policy: true, impacts: true },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('imp_1');
    });

    it('should throw NotFoundException if policyChange is not found', async () => {
      mockPrisma.policyChange.findFirst.mockResolvedValue(null);

      await expect(service.getImpacts('invalid_change', mockOrgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should generate and return default impact if policyChange exists without impact', async () => {
      const mockChange = {
        id: 'change_2',
        changeType: ChangeType.ADDED,
        fieldChanged: 'REQUIREMENT',
        description: 'New requirement added',
        policy: { orgId: mockOrgId },
        impacts: [],
      };

      const mockCreatedImpact = {
        id: 'imp_generated',
        policyChangeId: 'change_2',
        description: 'Operational compliance impact for added requirement: New requirement added',
        severity: ImpactSeverity.MEDIUM,
        status: ImpactStatus.IDENTIFIED,
      };

      mockPrisma.policyChange.findFirst.mockResolvedValue(mockChange);
      mockPrisma.impact.create.mockResolvedValue(mockCreatedImpact);

      const result = await service.getImpacts('change_2', mockOrgId);

      expect(mockPrisma.impact.create).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('imp_generated');
    });
  });

  describe('findAll', () => {
    it('should list all impacts scoped to organization', async () => {
      const mockImpacts = [
        {
          id: 'imp_1',
          policyChangeId: 'change_1',
          severity: ImpactSeverity.HIGH,
          status: ImpactStatus.IDENTIFIED,
          policyChange: {
            policy: { id: 'p1', name: 'Policy 1', orgId: mockOrgId },
            fromVersion: { id: 'v1', versionNumber: 1 },
            toVersion: { id: 'v2', versionNumber: 2 },
          },
        },
      ];

      mockPrisma.impact.findMany.mockResolvedValue(mockImpacts);

      const result = await service.findAll(undefined, mockOrgId);
      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe(ImpactSeverity.HIGH);
    });
  });

  describe('updateImpactStatus', () => {
    it('should update impact status for org', async () => {
      const existing = {
        id: 'imp_1',
        status: ImpactStatus.IDENTIFIED,
        policyChange: { policy: { orgId: mockOrgId } },
      };
      const updated = {
        id: 'imp_1',
        status: ImpactStatus.MITIGATED,
        updatedAt: new Date(),
      };

      mockPrisma.impact.findFirst.mockResolvedValue(existing);
      mockPrisma.impact.update.mockResolvedValue(updated);

      const result = await service.updateImpactStatus('imp_1', ImpactStatus.MITIGATED, mockOrgId);
      expect(result.status).toBe(ImpactStatus.MITIGATED);
    });

    it('should throw NotFoundException when updating nonexistent impact', async () => {
      mockPrisma.impact.findFirst.mockResolvedValue(null);

      await expect(
        service.updateImpactStatus('invalid_id', ImpactStatus.ACCEPTED, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
