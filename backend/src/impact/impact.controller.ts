import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ImpactService } from './impact.service.js';
import { ImpactSeverity, ImpactStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

@Controller('impact')
@UseGuards(JwtAuthGuard)
export class ImpactController {
  constructor(private readonly impactService: ImpactService) {}

  @Get()
  getAllImpacts(
    @CurrentUser() user: AuthenticatedUser,
    @Query('policyId') policyId?: string,
    @Query('severity') severity?: ImpactSeverity,
    @Query('status') status?: ImpactStatus,
  ) {
    return this.impactService.findAll({ policyId, severity, status }, user.orgId);
  }

  @Get('change/:changeId')
  getImpacts(
    @Param('changeId') changeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.impactService.getImpacts(changeId, user.orgId);
  }

  @Get(':id')
  getImpactById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.impactService.getImpactById(id, user.orgId);
  }

  @Patch(':id/status')
  updateImpactStatus(
    @Param('id') id: string,
    @Body('status') status: ImpactStatus,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.impactService.updateImpactStatus(id, status, user.orgId);
  }
}
