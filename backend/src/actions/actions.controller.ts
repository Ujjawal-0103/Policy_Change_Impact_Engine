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
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ActionsService } from './actions.service.js';
import { CreateActionDto } from './dto/create-action.dto.js';
import { UpdateActionStatusDto } from './dto/update-action-status.dto.js';
import { AssignActionDto } from './dto/assign-action.dto.js';
import { CreateEvidenceDto } from './dto/create-evidence.dto.js';
import { FilterActionDto } from './dto/filter-action.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import 'multer';

@Controller('actions')
@UseGuards(JwtAuthGuard)
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  /**
   * List actions with optional filtering scoped strictly to authenticated organization.
   * GET /actions
   */
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: FilterActionDto,
  ) {
    return this.actionsService.findAll(filter, user.orgId);
  }

  /**
   * Retrieve aggregate action statistics and KPIs for the authenticated organization.
   * GET /actions/stats
   */
  @Get('stats')
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.actionsService.getStats(user.orgId);
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
   * Retrieve a single action by ID scoped to organization.
   * GET /actions/:id
   */
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actionsService.findOne(id, user.orgId);
  }

  /**
   * Create an organizational Action linked to an existing Requirement in caller's organization.
   * POST /actions
   */
  @Post()
  create(
    @Body() dto: CreateActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actionsService.create(dto, user);
  }

  /**
   * Update action status and record an immutable audit history event.
   * PATCH /actions/:id/status
   */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateActionStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actionsService.updateStatus(id, dto, user);
  }

  /**
   * Assign an action to an owner user or department within organization.
   * PATCH /actions/:id/assign
   */
  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actionsService.assign(id, dto, user);
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
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.actionsService.addEvidence(id, dto, user, file);
  }
}
