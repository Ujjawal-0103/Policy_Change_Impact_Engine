import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImpactController } from './impact.controller.js';
import { ImpactService } from './impact.service.js';
import { ImpactSeverity, ImpactStatus } from '@prisma/client';

describe('ImpactController', () => {
  let controller: ImpactController;
  let service: ImpactService;

  const mockImpactService = {
    getImpacts: vi.fn(),
    findAll: vi.fn(),
    getImpactById: vi.fn(),
    updateImpactStatus: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockImpactService as unknown as ImpactService;
    controller = new ImpactController(service);
  });

  it('should delegate getImpacts to service', async () => {
    const mockImpacts = [
      {
        id: 'imp_1',
        policyChangeId: 'chg_1',
        description: 'Test impact',
        severity: ImpactSeverity.MEDIUM,
        status: ImpactStatus.IDENTIFIED,
      },
    ];

    mockImpactService.getImpacts.mockResolvedValue(mockImpacts);

    const result = await controller.getImpacts('chg_1');
    expect(mockImpactService.getImpacts).toHaveBeenCalledWith('chg_1');
    expect(result).toEqual(mockImpacts);
  });

  it('should delegate getAllImpacts with filters to service', async () => {
    const mockImpacts = [];
    mockImpactService.findAll.mockResolvedValue(mockImpacts);

    const result = await controller.getAllImpacts('p1', ImpactSeverity.HIGH, ImpactStatus.IDENTIFIED);
    expect(mockImpactService.findAll).toHaveBeenCalledWith({
      policyId: 'p1',
      severity: ImpactSeverity.HIGH,
      status: ImpactStatus.IDENTIFIED,
    });
    expect(result).toEqual(mockImpacts);
  });

  it('should delegate updateImpactStatus to service', async () => {
    const updated = { id: 'imp_1', status: ImpactStatus.MITIGATED };
    mockImpactService.updateImpactStatus.mockResolvedValue(updated);

    const result = await controller.updateImpactStatus('imp_1', ImpactStatus.MITIGATED);
    expect(mockImpactService.updateImpactStatus).toHaveBeenCalledWith('imp_1', ImpactStatus.MITIGATED);
    expect(result).toEqual(updated);
  });
});
