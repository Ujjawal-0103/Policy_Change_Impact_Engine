import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionsController } from './actions.controller.js';
import { ActionsService } from './actions.service.js';
import { ActionStatus, Priority } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

describe('ActionsController', () => {
  let controller: ActionsController;
  let service: ActionsService;

  const mockUser: AuthenticatedUser = {
    userId: 'user_1',
    orgId: 'org_1',
    email: 'admin@policyengine.local',
    name: 'Admin User',
  };

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      getStats: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      assign: vi.fn(),
      addEvidence: vi.fn(),
    } as unknown as ActionsService;

    controller = new ActionsController(service);
  });

  describe('findAll', () => {
    it('calls service.findAll with filter parameters and orgId', async () => {
      const mockActions = [{ id: 'action_1', title: 'Task 1' }];
      vi.mocked(service.findAll).mockResolvedValue(mockActions as any);

      const filter = { status: ActionStatus.PENDING, priority: Priority.HIGH };
      const result = await controller.findAll(mockUser, filter);

      expect(service.findAll).toHaveBeenCalledWith(filter, mockUser.orgId);
      expect(result).toEqual(mockActions);
    });
  });

  describe('getStats', () => {
    it('returns stats from service for orgId', async () => {
      const mockStats = { totalActions: 5, pending: 2, inProgress: 1, completed: 1, overdue: 1, blocked: 0 };
      vi.mocked(service.getStats).mockResolvedValue(mockStats as any);

      const result = await controller.getStats(mockUser);
      expect(service.getStats).toHaveBeenCalledWith(mockUser.orgId);
      expect(result).toEqual(mockStats);
    });
  });

  describe('create', () => {
    it('creates an action from dto with user context', async () => {
      const dto = { requirementId: 'req_1', title: 'Action 1' };
      const mockCreated = { id: 'action_1', ...dto };
      vi.mocked(service.create).mockResolvedValue(mockCreated as any);

      const result = await controller.create(dto, mockUser);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual(mockCreated);
    });
  });

  describe('updateStatus', () => {
    it('updates action status with user context', async () => {
      const dto = { status: ActionStatus.COMPLETED, note: 'Done' };
      const mockUpdated = { id: 'action_1', status: ActionStatus.COMPLETED };
      vi.mocked(service.updateStatus).mockResolvedValue(mockUpdated as any);

      const result = await controller.updateStatus('action_1', dto, mockUser);
      expect(service.updateStatus).toHaveBeenCalledWith('action_1', dto, mockUser);
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('assign', () => {
    it('assigns owner / department with user context', async () => {
      const dto = { department: 'Security' };
      const mockAssigned = { id: 'action_1', department: 'Security' };
      vi.mocked(service.assign).mockResolvedValue(mockAssigned as any);

      const result = await controller.assign('action_1', dto, mockUser);
      expect(service.assign).toHaveBeenCalledWith('action_1', dto, mockUser);
      expect(result).toEqual(mockAssigned);
    });
  });

  describe('addEvidence', () => {
    it('attaches evidence with user context', async () => {
      const dto = { title: 'Audit Report' };
      const mockEvidence = { id: 'ev_1', title: 'Audit Report' };
      vi.mocked(service.addEvidence).mockResolvedValue(mockEvidence as any);

      const result = await controller.addEvidence('action_1', dto, mockUser, undefined);
      expect(service.addEvidence).toHaveBeenCalledWith('action_1', dto, mockUser, undefined);
      expect(result).toEqual(mockEvidence);
    });
  });
});
