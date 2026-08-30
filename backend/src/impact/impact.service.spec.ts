import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ImpactService } from './impact.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ImpactSeverity, ImpactStatus, ChangeType, Priority } from '@prisma/client';

describe('ImpactService', () => {
  let service: ImpactService;
  let prisma: PrismaService;
  const mockOrgId = 'org_1';

  const mockPrisma = {
    policyChange: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    impact: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = mockPrisma as unknown as PrismaService;
    service = new ImpactService(prisma);
  });

  describe('analyzePolicyChange & calculateSeverityAndReason', () => {
    it('should identify affected requirements and actions and calculate HIGH severity for deadline shift', async () => {
      const mockChange = {
        id: 'change_101',
        policyId: 'policy_1',
        changeType: ChangeType.MODIFIED,
        fieldChanged: 'DEADLINE',
        description: 'Reporting deadline moved from quarterly to monthly',
        affectedSection: 'Section 4.1',
        oldValue: 'Quarterly',
        newValue: 'Monthly',
        sourceReference: 'Section 4.1',
        policy: { id: 'policy_1', orgId: mockOrgId },
        fromVersion: {
          requirements: [
            {
              id: 'req_1',
              title: 'Section 4.1 Reporting',
              description: 'Submit quarterly compliance reports to regulator',
              priority: Priority.HIGH,
              actions: [
                {
                  id: 'act_1',
                  title: 'Quarterly Audit Review',
                  priority: Priority.HIGH,
                  department: 'Finance',
                  assignedTo: { id: 'u1', name: 'Alice Finance', email: 'alice@test.com' },
                  evidence: [{ id: 'ev_1', title: 'Audit Report PDF' }],
                },
              ],
            },
          ],
        },
        toVersion: {
          requirements: [],
        },
        impacts: [],
      };

      mockPrisma.policyChange.findFirst.mockResolvedValue(mockChange);
      mockPrisma.impact.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.impact.createMany.mockResolvedValue({ count: 1 });

      const createdImpactRecord = {
        id: 'imp_1',
        policyChangeId: 'change_101',
        requirementId: 'req_1',
        actionId: 'act_1',
        description: 'Action Impact: Quarterly Audit Review — Reporting deadline moved from quarterly to monthly',
        reason: 'Deadline requirement altered in section "Section 4.1" (Reporting deadline moved from quarterly to monthly). Operational action "Quarterly Audit Review" (assigned to Alice Finance) requires schedule adjustment and priority review.',
        severity: ImpactSeverity.CRITICAL,
        status: ImpactStatus.IDENTIFIED,
      };

      mockPrisma.impact.findMany.mockResolvedValue([createdImpactRecord]);

      const result = await service.analyzePolicyChange('change_101', mockOrgId);

      expect(mockPrisma.impact.create).toHaveBeenCalled();
      const createdData = mockPrisma.impact.create.mock.calls[0][0].data;
      expect(createdData.requirementId).toBe('req_1');
      expect(createdData.actionId).toBe('act_1');
      expect(createdData.severity).toBe(ImpactSeverity.CRITICAL);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('imp_1');
    });

    it('should create requirement-level impact if requirement has no actions', async () => {
      const mockChange = {
        id: 'change_102',
        policyId: 'policy_1',
        changeType: ChangeType.ADDED,
        fieldChanged: 'REQUIREMENT',
        description: 'New mandatory data retention policy added',
        affectedSection: 'Data Privacy',
        policy: { id: 'policy_1', orgId: mockOrgId },
        fromVersion: { requirements: [] },
        toVersion: {
          requirements: [
            {
              id: 'req_new',
              title: 'Data Privacy Retention',
              description: 'Retain logs for 7 years',
              priority: Priority.MEDIUM,
              actions: [],
            },
          ],
        },
        impacts: [],
      };

      mockPrisma.policyChange.findFirst.mockResolvedValue(mockChange);
      mockPrisma.impact.create.mockResolvedValue({ id: 'imp_req' });
      mockPrisma.impact.findMany.mockResolvedValue([
        {
          id: 'imp_req',
          policyChangeId: 'change_102',
          requirementId: 'req_new',
          actionId: null,
          severity: ImpactSeverity.CRITICAL, // Contains "mandatory"
          status: ImpactStatus.IDENTIFIED,
        },
      ]);

      const result = await service.analyzePolicyChange('change_102', mockOrgId);

      expect(mockPrisma.impact.create).toHaveBeenCalled();
      const createdData = mockPrisma.impact.create.mock.calls[0][0].data;
      expect(createdData.requirementId).toBe('req_new');
      expect(createdData.actionId).toBeNull();
      expect(result).toHaveLength(1);
    });

    it('should prevent duplicates and preserve user-updated status on re-analysis', async () => {
      const mockChange = {
        id: 'change_103',
        policyId: 'policy_1',
        changeType: ChangeType.MODIFIED,
        fieldChanged: 'EVIDENCE',
        description: 'Evidence verification changed',
        affectedSection: 'General',
        policy: { id: 'policy_1', orgId: mockOrgId },
        fromVersion: {
          requirements: [
            {
              id: 'req_1',
              title: 'General Compliance',
              description: 'Provide evidence for compliance',
              priority: Priority.MEDIUM,
              actions: [{ id: 'act_1', title: 'Upload Certificate', priority: Priority.MEDIUM, assignedTo: null, evidence: [] }],
            },
          ],
        },
        toVersion: { requirements: [] },
        impacts: [
          {
            id: 'imp_existing',
            policyChangeId: 'change_103',
            requirementId: 'req_1',
            actionId: 'act_1',
            status: ImpactStatus.MITIGATED, // User marked this mitigated previously
          },
        ],
      };

      mockPrisma.policyChange.findFirst.mockResolvedValue(mockChange);
      mockPrisma.impact.update.mockResolvedValue({ id: 'imp_existing', status: ImpactStatus.MITIGATED });
      mockPrisma.impact.findMany.mockResolvedValue([]);

      await service.analyzePolicyChange('change_103', mockOrgId);

      expect(mockPrisma.impact.update).toHaveBeenCalledWith({
        where: { id: 'imp_existing' },
        data: expect.objectContaining({
          status: ImpactStatus.MITIGATED,
        }),
      });
    });

    it('should throw NotFoundException if policyChange not found or belongs to different tenant', async () => {
      mockPrisma.policyChange.findFirst.mockResolvedValue(null);

      await expect(service.analyzePolicyChange('invalid_or_other_org', mockOrgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should query impacts strictly scoped to organization and apply filters', async () => {
      const mockImpacts = [
        {
          id: 'imp_1',
          severity: ImpactSeverity.HIGH,
          status: ImpactStatus.IDENTIFIED,
          policyChange: { policy: { id: 'p1', orgId: mockOrgId } },
        },
      ];

      mockPrisma.impact.findMany.mockResolvedValue(mockImpacts);

      const result = await service.findAll(
        { policyId: 'p1', severity: ImpactSeverity.HIGH, status: ImpactStatus.IDENTIFIED, search: 'Audit' },
        mockOrgId,
      );

      expect(mockPrisma.impact.findMany).toHaveBeenCalled();
      const whereArg = mockPrisma.impact.findMany.mock.calls[0][0].where;
      expect(whereArg.policyChange.policy.orgId).toBe(mockOrgId);
      expect(whereArg.policyChange.policy.id).toBe('p1');
      expect(whereArg.severity).toBe(ImpactSeverity.HIGH);
      expect(result).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should calculate aggregate metrics scoped to organization', async () => {
      const mockRecords = [
        { id: '1', severity: ImpactSeverity.CRITICAL, status: ImpactStatus.IDENTIFIED, requirementId: 'r1', actionId: 'a1' },
        { id: '2', severity: ImpactSeverity.HIGH, status: ImpactStatus.MITIGATED, requirementId: 'r1', actionId: 'a2' },
        { id: '3', severity: ImpactSeverity.MEDIUM, status: ImpactStatus.IDENTIFIED, requirementId: 'r2', actionId: null },
        { id: '4', severity: ImpactSeverity.LOW, status: ImpactStatus.ACCEPTED, requirementId: null, actionId: null },
      ];

      mockPrisma.impact.findMany.mockResolvedValue(mockRecords);

      const stats = await service.getStats(mockOrgId);

      expect(stats.total).toBe(4);
      expect(stats.critical).toBe(1);
      expect(stats.high).toBe(1);
      expect(stats.medium).toBe(1);
      expect(stats.low).toBe(1);
      expect(stats.criticalAndHigh).toBe(2);
      expect(stats.byStatus.identified).toBe(2);
      expect(stats.byStatus.mitigated).toBe(1);
      expect(stats.requirementsAffectedCount).toBe(2);
      expect(stats.actionsAffectedCount).toBe(2);
    });
  });

  describe('updateImpactStatus', () => {
    it('should update impact status with strict tenant isolation', async () => {
      const existing = {
        id: 'imp_1',
        status: ImpactStatus.IDENTIFIED,
        policyChange: { policy: { orgId: mockOrgId } },
      };
      const updated = {
        id: 'imp_1',
        status: ImpactStatus.MITIGATED,
      };

      mockPrisma.impact.findFirst.mockResolvedValue(existing);
      mockPrisma.impact.update.mockResolvedValue(updated);

      const result = await service.updateImpactStatus('imp_1', ImpactStatus.MITIGATED, mockOrgId);

      expect(mockPrisma.impact.findFirst).toHaveBeenCalledWith({
        where: { id: 'imp_1', policyChange: { policy: { orgId: mockOrgId } } },
        include: { policyChange: { include: { policy: true } } },
      });
      expect(result.status).toBe(ImpactStatus.MITIGATED);
    });

    it('should throw NotFoundException when updating an impact belonging to another tenant', async () => {
      mockPrisma.impact.findFirst.mockResolvedValue(null);

      await expect(
        service.updateImpactStatus('imp_other_tenant', ImpactStatus.ACCEPTED, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
