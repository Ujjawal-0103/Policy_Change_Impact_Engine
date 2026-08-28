import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import 'multer';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Upload a policy PDF document, extract page-aware text, and store in Cloudinary & DB.
   * Max file size: 25MB.
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 25 * 1024 * 1024, // 25 MB
      },
    }),
  )
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 25 * 1024 * 1024,
            message: 'File size exceeds the 25MB limit.',
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('No PDF file uploaded.');
    }
    return this.documentsService.upload(file, dto);
  }

  /**
   * Retrieve all uploaded policy documents with metadata and page counts.
   */
  @Get()
  async findAll() {
    return this.documentsService.findAll();
  }

  /**
   * Development preview fallback for documents uploaded without Cloudinary credentials.
   */
  @Get('dev-preview/:filename')
  devPreview(@Param('filename') filename: string) {
    return {
      message: 'This document was processed in local development mode before Cloudinary credentials were active.',
      filename,
      status: 'Extracted text is fully stored in the database. Configure CLOUDINARY_API_SECRET in backend/.env for live cloud hosting.',
    };
  }

  /**
   * Retrieve a single document with its metadata and extracted page-aware text.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  /**
   * Analyze a document's extracted pages using Gemini AI to extract
   * structured requirements, suggested actions, deadlines, and responsibilities.
   */
  @Post(':id/analyze')
  async analyze(@Param('id') id: string) {
    return this.documentsService.analyze(id);
  }
}

