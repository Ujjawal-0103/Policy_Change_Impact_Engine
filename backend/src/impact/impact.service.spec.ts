import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ImpactService } from './impact.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ImpactSeverity, ImpactStatus, ChangeType } from '@prisma/client';

describe('ImpactService', () => {
  let service: ImpactService;
  let prisma: PrismaService;

  const mockPrisma = {
    policyChange: {
      findUnique: vi.fn(),
    },
    impact: {
      findUnique: vi.fn(),
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
    it('should return existing impacts for a valid policyChangeId', async () => {
      const mockChange = {
        id: 'change_1',
        changeType: ChangeType.MODIFIED,
        fieldChanged: 'REQUIREMENT',
        description: 'Updated requirement description',
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

      mockPrisma.policyChange.findUnique.mockResolvedValue(mockChange);

      const result = await service.getImpacts('change_1');

      expect(mockPrisma.policyChange.findUnique).toHaveBeenCalledWith({
        where: { id: 'change_1' },
        include: { impacts: true },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('imp_1');
    });

    it('should throw NotFoundException if policyChange is not found', async () => {
      mockPrisma.policyChange.findUnique.mockResolvedValue(null);

      await expect(service.getImpacts('invalid_change')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should generate and return default impact if policyChange exists without impact', async () => {
      const mockChange = {
        id: 'change_2',
        changeType: ChangeType.ADDED,
        fieldChanged: 'REQUIREMENT',
        description: 'New requirement added',
        impacts: [],
      };

      const mockCreatedImpact = {
        id: 'imp_generated',
        policyChangeId: 'change_2',
        description: 'Operational compliance impact for added requirement: New requirement added',
        severity: ImpactSeverity.MEDIUM,
        status: ImpactStatus.IDENTIFIED,
      };

      mockPrisma.policyChange.findUnique.mockResolvedValue(mockChange);
      mockPrisma.impact.create.mockResolvedValue(mockCreatedImpact);

      const result = await service.getImpacts('change_2');

      expect(mockPrisma.impact.create).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('imp_generated');
    });
  });

  describe('findAll', () => {
    it('should list all impacts with relations', async () => {
      const mockImpacts = [
        {
          id: 'imp_1',
          policyChangeId: 'change_1',
          severity: ImpactSeverity.HIGH,
          status: ImpactStatus.IDENTIFIED,
          policyChange: {
            policy: { id: 'p1', name: 'Policy 1' },
            fromVersion: { id: 'v1', versionNumber: 1 },
            toVersion: { id: 'v2', versionNumber: 2 },
          },
        },
      ];

      mockPrisma.impact.findMany.mockResolvedValue(mockImpacts);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe(ImpactSeverity.HIGH);
    });
  });

  describe('updateImpactStatus', () => {
    it('should update impact status', async () => {
      const existing = {
        id: 'imp_1',
        status: ImpactStatus.IDENTIFIED,
      };
      const updated = {
        id: 'imp_1',
        status: ImpactStatus.MITIGATED,
        updatedAt: new Date(),
      };

      mockPrisma.impact.findUnique.mockResolvedValue(existing);
      mockPrisma.impact.update.mockResolvedValue(updated);

      const result = await service.updateImpactStatus('imp_1', ImpactStatus.MITIGATED);
      expect(result.status).toBe(ImpactStatus.MITIGATED);
    });

    it('should throw NotFoundException when updating nonexistent impact', async () => {
      mockPrisma.impact.findUnique.mockResolvedValue(null);

      await expect(
        service.updateImpactStatus('invalid_id', ImpactStatus.ACCEPTED),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
