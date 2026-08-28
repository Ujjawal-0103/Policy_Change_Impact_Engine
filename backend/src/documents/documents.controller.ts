import { Controller, Get, Post, Param } from '@nestjs/common';
import { DocumentsService } from './documents.service.js';

// TODO: Implement document endpoints:
// POST /documents/upload  — Cloudinary upload + DB record
// GET  /documents         — list documents for org
// GET  /documents/:id     — get document by ID
// POST /documents/:id/analyze — trigger Gemini AI extraction
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }
}
