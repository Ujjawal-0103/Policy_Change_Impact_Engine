import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RequirementsService } from './requirements.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

@Controller('requirements')
@UseGuards(JwtAuthGuard)
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('policyVersionId') policyVersionId?: string,
    @Query('policyId') policyId?: string,
  ) {
    return this.requirementsService.findAll({ policyVersionId, policyId }, user.orgId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requirementsService.findOne(id, user.orgId);
  }
}
