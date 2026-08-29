import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ActionsService } from './actions.service.js';
import { CreateActionDto } from './dto/create-action.dto.js';
import { UpdateActionStatusDto } from './dto/update-action-status.dto.js';
import { AssignActionDto } from './dto/assign-action.dto.js';
import { CreateEvidenceDto } from './dto/create-evidence.dto.js';
import { FilterActionDto } from './dto/filter-action.dto.js';
import 'multer';

@Controller('actions')
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  /**
   * List actions with optional filtering by status, priority, department, requirement, or search query.
   * GET /actions
   */
  @Get()
  findAll(@Query() filter: FilterActionDto) {
    return this.actionsService.findAll(filter);
  }

  /**
   * Retrieve aggregate action statistics and KPIs for the Dashboard and Actions overview.
   * GET /actions/stats
   */
  @Get('stats')
  getStats() {
    return this.actionsService.getStats();
  }

  /**
   * Development preview fallback for evidence uploaded before live Cloudinary credentials.
   * GET /actions/evidence-preview/:filename
   */
  @Get('evidence-preview/:filename')
  devEvidencePreview(@Param('filename') filename: string) {
    return {
      message: 'Evidence attachment processed in local development mode.',
      filename,
      status: 'Evidence metadata stored in database.',
    };
  }

  /**
   * Retrieve a single action by ID with requirement, assignment, evidence, and audit history.
   * GET /actions/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.actionsService.findOne(id);
  }

  /**
   * Create an organizational Action linked to an existing Requirement.
   * POST /actions
   */
  @Post()
  create(@Body() dto: CreateActionDto) {
    return this.actionsService.create(dto);
  }

  /**
   * Update action status and record an immutable audit history event.
   * PATCH /actions/:id/status
   */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateActionStatusDto,
  ) {
    return this.actionsService.updateStatus(id, dto);
  }

  /**
   * Assign an action to an owner user or department.
   * PATCH /actions/:id/assign
   */
  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignActionDto,
  ) {
    return this.actionsService.assign(id, dto);
  }

  /**
   * Attach evidence to an Action with optional file upload (Cloudinary).
   * POST /actions/:id/evidence
   */
  @Post(':id/evidence')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
      },
    }),
  )
  addEvidence(
    @Param('id') id: string,
    @Body() dto: CreateEvidenceDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.actionsService.addEvidence(id, dto, file);
  }
}
