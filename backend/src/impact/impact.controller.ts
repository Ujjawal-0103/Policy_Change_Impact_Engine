import { Controller, Get, Param, Query, Patch, Body } from '@nestjs/common';
import { ImpactService } from './impact.service.js';
import { ImpactSeverity, ImpactStatus } from '@prisma/client';

@Controller('impacts')
export class ImpactController {
  constructor(private readonly impactService: ImpactService) {}

  @Get()
  getAllImpacts(
    @Query('policyId') policyId?: string,
    @Query('severity') severity?: ImpactSeverity,
    @Query('status') status?: ImpactStatus,
  ) {
    return this.impactService.findAll({ policyId, severity, status });
  }

  @Get(':changeId')
  getImpacts(@Param('changeId') changeId: string) {
    return this.impactService.getImpacts(changeId);
  }

  @Get('detail/:id')
  getImpactById(@Param('id') id: string) {
    return this.impactService.getImpactById(id);
  }

  @Patch(':id/status')
  updateImpactStatus(
    @Param('id') id: string,
    @Body('status') status: ImpactStatus,
  ) {
    return this.impactService.updateImpactStatus(id, status);
  }
}

