import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import 'multer';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Upload and process a PDF document.
   * POST /documents/upload
   * Accepts multipart/form-data with `file` and optional `title`.
   * Automatically extracts text per page and saves pages to DB.
   * Scoped strictly to authenticated user and organization.
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
      },
      fileFilter: (_req, file, cb) => {
        if (
          file.mimetype !== 'application/pdf' &&
          !file.originalname.toLowerCase().endsWith('.pdf')
        ) {
          return cb(
            new BadRequestException(
              'Invalid file type. Only PDF documents (.pdf) are accepted.',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('File is required. Please attach a PDF document.');
    }

    return this.documentsService.upload(file, dto, user);
  }

  /**
   * List all documents scoped to authenticated organization.
   * GET /documents
   */
  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.findAll(user.orgId);
  }

  /**
   * Development preview endpoint for local files.
   * GET /documents/preview/:filename
   */
  @Get('preview/:filename')
  previewFile(@Param('filename') filename: string) {
    return {
      message: 'PDF preview endpoint is active in local development mode.',
      filename,
      note: 'In production with Cloudinary configured, full secure storage URLs will be served.',
    };
  }

  /**
   * Get document metadata and extracted text per page.
   * GET /documents/:id
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.findOne(id, user.orgId);
  }

  /**
   * Run AI analysis on an uploaded document to extract compliance requirements.
   * POST /documents/:id/analyze
   */
  @Post(':id/analyze')
  async analyze(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.analyze(id, user.orgId);
  }
}
