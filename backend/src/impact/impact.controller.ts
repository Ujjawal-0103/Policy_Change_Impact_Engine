import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ImpactService } from './impact.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { UpdateImpactStatusDto } from './dto/update-impact-status.dto.js';
import { FilterImpactDto } from './dto/filter-impact.dto.js';

@Controller(['impact', 'impacts'])
@UseGuards(JwtAuthGuard)
export class ImpactController {
  constructor(private readonly impactService: ImpactService) {}

  @Get()
  getAllImpacts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: FilterImpactDto,
  ) {
    return this.impactService.findAll(filter, user.orgId);
  }

  @Get('stats')
  getImpactStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('policyId') policyId?: string,
  ) {
    return this.impactService.getStats(user.orgId, policyId);
  }

  @Get('change/:changeId')
  getImpacts(
    @Param('changeId') changeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.impactService.getImpacts(changeId, user.orgId);
  }

  @Post('analyze/change/:changeId')
  @HttpCode(HttpStatus.OK)
  analyzePolicyChange(
    @Param('changeId') changeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.impactService.analyzePolicyChange(changeId, user.orgId);
  }

  @Post('analyze/versions')
  @HttpCode(HttpStatus.OK)
  analyzePolicyVersions(
    @Body() body: { policyId: string; fromVersionId: string; toVersionId: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.impactService.analyzePolicyVersions(
      body.policyId,
      body.fromVersionId,
      body.toVersionId,
      user.orgId,
    );
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
    @Body() dto: UpdateImpactStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.impactService.updateImpactStatus(id, dto.status, user.orgId);
  }
}
