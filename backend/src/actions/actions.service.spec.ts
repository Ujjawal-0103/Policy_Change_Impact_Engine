import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionsService } from './actions.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ActionStatus, Priority } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

describe('ActionsService', () => {
  let service: ActionsService;
  let mockPrisma: any;
  let mockCloudinary: any;

  const mockUser: AuthenticatedUser = {
    userId: 'user_1',
    orgId: 'org_1',
    email: 'admin@policyengine.local',
    name: 'Admin User',
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      organization: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      requirement: {
        findUnique: vi.fn(),
      },
      action: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      actionHistory: {
        create: vi.fn(),
      },
      evidence: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockCloudinary = {
      uploadEvidenceFile: vi.fn(),
    };

    service = new ActionsService(mockPrisma, mockCloudinary);
  });

  describe('create', () => {
    it('throws NotFoundException if requirement does not exist', async () => {
      mockPrisma.requirement.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            requirementId: 'req_non_existent',
            title: 'Implement MFA',
          },
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if assigned user does not exist in org', async () => {
      mockPrisma.requirement.findUnique.mockResolvedValue({
        id: 'req_1',
        title: 'MFA Mandate',
        priority: Priority.HIGH,
        policyVersion: { policy: { orgId: 'org_1' } },
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            requirementId: 'req_1',
            title: 'Implement MFA',
            assignedToId: 'user_non_existent',
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully creates an Action linked to Requirement with audit history', async () => {
      mockPrisma.requirement.findUnique.mockResolvedValue({
        id: 'req_1',
        title: 'MFA Mandate',
        priority: Priority.HIGH,
        deadline: new Date('2026-12-31'),
        policyVersion: { policy: { orgId: 'org_1' } },
      });

      const mockCreatedAction = {
        id: 'action_1',
        requirementId: 'req_1',
        title: 'Implement MFA for Admins',
        description: 'Implement MFA for Admins',
        status: ActionStatus.PENDING,
        priority: Priority.HIGH,
        department: 'Security',
        assignedToId: null,
        deadline: new Date('2026-12-31'),
        history: [{ id: 'hist_1', field: 'status', newValue: ActionStatus.PENDING }],
      };
      mockPrisma.action.create.mockResolvedValue(mockCreatedAction);

      const result = await service.create(
        {
          requirementId: 'req_1',
          title: 'Implement MFA for Admins',
          department: 'Security',
        },
        mockUser,
      );

      expect(result).toEqual(expect.objectContaining(mockCreatedAction));
      expect(mockPrisma.action.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requirementId: 'req_1',
            title: 'Implement MFA for Admins',
            priority: Priority.HIGH,
            department: 'Security',
          }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException if action does not exist in org', async () => {
      mockPrisma.action.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus(
          'action_missing',
          { status: ActionStatus.IN_PROGRESS },
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('records ActionHistory and updates status when status changes', async () => {
      mockPrisma.action.findUnique.mockResolvedValue({
        id: 'action_1',
        status: ActionStatus.PENDING,
        requirement: { policyVersion: { policy: { orgId: 'org_1' } } },
      });

      const mockUpdated = {
        id: 'action_1',
        status: ActionStatus.IN_PROGRESS,
      };
      mockPrisma.action.update.mockResolvedValue(mockUpdated);

      const result = await service.updateStatus(
        'action_1',
        {
          status: ActionStatus.IN_PROGRESS,
          note: 'Started work on MFA configuration',
        },
        mockUser,
      );

      expect(mockPrisma.actionHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionId: 'action_1',
            field: 'status',
            oldValue: ActionStatus.PENDING,
            newValue: ActionStatus.IN_PROGRESS,
            note: 'Started work on MFA configuration',
            userId: 'user_1',
          }),
        }),
      );
      expect(result.status).toBe(ActionStatus.IN_PROGRESS);
    });
  });

  describe('assign', () => {
    it('updates department and records history', async () => {
      mockPrisma.action.findUnique.mockResolvedValue({
        id: 'action_1',
        department: 'IT',
        assignedTo: null,
        requirement: { policyVersion: { policy: { orgId: 'org_1' } } },
      });
      mockPrisma.action.update.mockResolvedValue({
        id: 'action_1',
        department: 'InfoSec',
      });

      await service.assign('action_1', { department: 'InfoSec' }, mockUser);

      expect(mockPrisma.actionHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            field: 'department',
            oldValue: 'IT',
            newValue: 'InfoSec',
            userId: 'user_1',
          }),
        }),
      );
    });
  });

  describe('addEvidence', () => {
    it('creates Evidence and records audit history', async () => {
      mockPrisma.action.findUnique.mockResolvedValue({
        id: 'action_1',
        requirement: { policyVersion: { policy: { orgId: 'org_1' } } },
      });
      mockPrisma.evidence.create.mockResolvedValue({
        id: 'ev_1',
        actionId: 'action_1',
        title: 'MFA Audit Log',
        fileUrl: 'https://cloudinary.com/evidence.pdf',
      });

      const result = await service.addEvidence(
        'action_1',
        {
          title: 'MFA Audit Log',
          fileUrl: 'https://cloudinary.com/evidence.pdf',
        },
        mockUser,
      );

      expect(result.id).toBe('ev_1');
      expect(mockPrisma.actionHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            field: 'evidence',
            newValue: 'MFA Audit Log',
            userId: 'user_1',
          }),
        }),
      );
    });
  });

  describe('getStats', () => {
    it('deterministically calculates overdue actions based on deadline for organization', async () => {
      const pastDate = new Date(Date.now() - 86400000); // yesterday
      const futureDate = new Date(Date.now() + 86400000); // tomorrow

      mockPrisma.action.findMany.mockResolvedValue([
        { id: '1', status: ActionStatus.PENDING, priority: Priority.HIGH, deadline: pastDate }, // OVERDUE
        { id: '2', status: ActionStatus.IN_PROGRESS, priority: Priority.MEDIUM, deadline: futureDate }, // IN_PROGRESS
        { id: '3', status: ActionStatus.COMPLETED, priority: Priority.CRITICAL, deadline: pastDate }, // COMPLETED (not overdue)
        { id: '4', status: ActionStatus.BLOCKED, priority: Priority.LOW, deadline: null }, // BLOCKED
      ]);

      const stats = await service.getStats('org_1');

      expect(stats.totalActions).toBe(4);
      expect(stats.overdue).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.blocked).toBe(1);
      expect(stats.byPriority.HIGH).toBe(1);
      expect(stats.byPriority.MEDIUM).toBe(1);
      expect(stats.byPriority.CRITICAL).toBe(1);
      expect(stats.byPriority.LOW).toBe(1);
    });
  });
});
