import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PoliciesService } from './policies.service.js';
import { CreatePolicyDto } from './dto/create-policy.dto.js';
import { CreateVersionDto } from './dto/create-version.dto.js';
import { CompareVersionsDto } from './dto/compare-versions.dto.js';
import { UpdateVersionStatusDto } from './dto/update-version-status.dto.js';

@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPolicyDto: CreatePolicyDto) {
    return this.policiesService.create(createPolicyDto);
  }

  @Get()
  findAll() {
    return this.policiesService.findAll();
  }

  @Post('compare')
  @HttpCode(HttpStatus.OK)
  compareVersions(@Body() compareDto: CompareVersionsDto) {
    return this.policiesService.compareVersions(compareDto);
  }

  @Get('changes/:changeId')
  getChangeById(@Param('changeId') changeId: string) {
    return this.policiesService.getChangeById(changeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.policiesService.findOne(id);
  }

  @Get(':id/versions')
  getVersions(@Param('id') id: string) {
    return this.policiesService.getVersions(id);
  }

  @Post(':id/versions')
  @HttpCode(HttpStatus.CREATED)
  createVersion(
    @Param('id') id: string,
    @Body() createVersionDto: CreateVersionDto,
  ) {
    return this.policiesService.createVersion(id, createVersionDto);
  }

  @Patch(':id/versions/:versionId/status')
  updateVersionStatus(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() dto: UpdateVersionStatusDto,
  ) {
    return this.policiesService.updateVersionStatus(id, versionId, dto.status);
  }

  @Get(':id/changes')
  getChanges(
    @Param('id') id: string,
    @Query('fromVersionId') fromVersionId?: string,
    @Query('toVersionId') toVersionId?: string,
  ) {
    return this.policiesService.getChanges(id, fromVersionId, toVersionId);
  }
}
