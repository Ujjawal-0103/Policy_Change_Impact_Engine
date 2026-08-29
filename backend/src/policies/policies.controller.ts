import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PoliciesService } from './policies.service.js';
import { CreatePolicyDto } from './dto/create-policy.dto.js';
import { CreateVersionDto } from './dto/create-version.dto.js';
import { CompareVersionsDto } from './dto/compare-versions.dto.js';
import { UpdateVersionStatusDto } from './dto/update-version-status.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

@Controller('policies')
@UseGuards(JwtAuthGuard)
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  /**
   * Create a new policy with optional initial document.
   * POST /policies
   */
  @Post()
  create(
    @Body() createPolicyDto: CreatePolicyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.policiesService.create(createPolicyDto, user.orgId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.policiesService.findAll(user.orgId);
  }

  /**
   * Compare two versions of a policy and detect changes via AI.
   * POST /policies/compare
   */
  @Post('compare')
  compareVersions(
    @Body() compareDto: CompareVersionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.policiesService.compareVersions(compareDto, user.orgId);
  }

  /**
   * Get all detected changes for a specific policy.
   * GET /policies/:id/changes
   */
  @Get(':id/changes')
  getChanges(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('fromVersionId') fromVersionId?: string,
    @Query('toVersionId') toVersionId?: string,
  ) {
    return this.policiesService.getChanges(id, fromVersionId, toVersionId, user.orgId);
  }

  /**
   * Get a specific detected change by its ID.
   * GET /policies/changes/:changeId
   */
  @Get('changes/:changeId')
  getChangeById(
    @Param('changeId') changeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.policiesService.getChangeById(changeId, user.orgId);
  }

  /**
   * Get all versions of a specific policy.
   * GET /policies/:id/versions
   */
  @Get(':id/versions')
  getVersions(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.policiesService.getVersions(id, user.orgId);
  }

  /**
   * Create a new version for an existing policy.
   * POST /policies/:id/versions
   */
  @Post(':id/versions')
  createVersion(
    @Param('id') id: string,
    @Body() createVersionDto: CreateVersionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.policiesService.createVersion(id, createVersionDto, user.orgId);
  }

  /**
   * Update the status of a specific policy version.
   * PATCH /policies/:id/versions/:versionId/status
   */
  @Patch(':id/versions/:versionId/status')
  updateVersionStatus(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() dto: UpdateVersionStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.policiesService.updateVersionStatus(id, versionId, dto.status, user.orgId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.policiesService.findOne(id, user.orgId);
  }
}
