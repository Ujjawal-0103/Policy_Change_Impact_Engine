import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { PdfExtractorService } from './pdf-extractor.service.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  imports: [CloudinaryModule, AiModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, PdfExtractorService],
  exports: [DocumentsService, PdfExtractorService],
})
export class DocumentsModule {}

