import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PoliciesController } from './policies.controller.js';
import { PoliciesService } from './policies.service.js';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

describe('PoliciesController', () => {
  let controller: PoliciesController;
  let serviceMock: any;

  const mockUser: AuthenticatedUser = {
    userId: 'user_1',
    orgId: 'org_1',
    email: 'admin@test.com',
    name: 'Admin',
  };

  beforeEach(() => {
    serviceMock = {
      create: vi.fn().mockResolvedValue({ id: 'pol-1', name: 'Policy 1' }),
      findAll: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue({ id: 'pol-1', name: 'Policy 1' }),
      getVersions: vi.fn().mockResolvedValue([]),
      createVersion: vi.fn().mockResolvedValue({ id: 'ver-1', versionNumber: 1 }),
      updateVersionStatus: vi.fn().mockResolvedValue({ id: 'ver-1', status: 'ACTIVE' }),
      compareVersions: vi.fn().mockResolvedValue({ summary: { totalChanges: 0 }, changes: [] }),
      getChanges: vi.fn().mockResolvedValue([]),
      getChangeById: vi.fn().mockResolvedValue({ id: 'change-1' }),
    };

    controller = new PoliciesController(serviceMock as unknown as PoliciesService);
  });

  it('delegates create to service with orgId', async () => {
    const dto = { name: 'New Policy' };
    const res = await controller.create(dto, mockUser);
    expect(serviceMock.create).toHaveBeenCalledWith(dto, mockUser.orgId);
    expect(res).toEqual({ id: 'pol-1', name: 'Policy 1' });
  });

  it('delegates findAll to service with orgId', async () => {
    await controller.findAll(mockUser);
    expect(serviceMock.findAll).toHaveBeenCalledWith(mockUser.orgId);
  });

  it('delegates compareVersions to service with orgId', async () => {
    const compareDto = { fromVersionId: 'v1', toVersionId: 'v2' };
    await controller.compareVersions(compareDto, mockUser);
    expect(serviceMock.compareVersions).toHaveBeenCalledWith(compareDto, mockUser.orgId);
  });

  it('delegates getVersions to service with orgId', async () => {
    await controller.getVersions('pol-1', mockUser);
    expect(serviceMock.getVersions).toHaveBeenCalledWith('pol-1', mockUser.orgId);
  });

  it('delegates createVersion to service with orgId', async () => {
    const dto = { documentId: 'doc-1' };
    await controller.createVersion('pol-1', dto, mockUser);
    expect(serviceMock.createVersion).toHaveBeenCalledWith('pol-1', dto, mockUser.orgId);
  });

  it('delegates updateVersionStatus to service with orgId', async () => {
    const dto = { status: 'ACTIVE' as const };
    await controller.updateVersionStatus('pol-1', 'ver-1', dto, mockUser);
    expect(serviceMock.updateVersionStatus).toHaveBeenCalledWith('pol-1', 'ver-1', 'ACTIVE', mockUser.orgId);
  });
});
