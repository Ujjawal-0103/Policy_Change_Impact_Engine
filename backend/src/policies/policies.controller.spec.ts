import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PoliciesController } from './policies.controller.js';
import { PoliciesService } from './policies.service.js';

describe('PoliciesController', () => {
  let controller: PoliciesController;
  let serviceMock: any;

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

  it('delegates create to service', async () => {
    const dto = { name: 'New Policy' };
    const res = await controller.create(dto);
    expect(serviceMock.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ id: 'pol-1', name: 'Policy 1' });
  });

  it('delegates findAll to service', async () => {
    await controller.findAll();
    expect(serviceMock.findAll).toHaveBeenCalled();
  });

  it('delegates compareVersions to service', async () => {
    const compareDto = { fromVersionId: 'v1', toVersionId: 'v2' };
    await controller.compareVersions(compareDto);
    expect(serviceMock.compareVersions).toHaveBeenCalledWith(compareDto);
  });

  it('delegates getVersions to service', async () => {
    await controller.getVersions('pol-1');
    expect(serviceMock.getVersions).toHaveBeenCalledWith('pol-1');
  });

  it('delegates createVersion to service', async () => {
    const dto = { documentId: 'doc-1' };
    await controller.createVersion('pol-1', dto);
    expect(serviceMock.createVersion).toHaveBeenCalledWith('pol-1', dto);
  });

  it('delegates updateVersionStatus to service', async () => {
    const dto = { status: 'ACTIVE' as const };
    await controller.updateVersionStatus('pol-1', 'ver-1', dto);
    expect(serviceMock.updateVersionStatus).toHaveBeenCalledWith('pol-1', 'ver-1', 'ACTIVE');
  });
});
