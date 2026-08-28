import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { PdfExtractorService } from './pdf-extractor.service.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';

@Module({
  imports: [CloudinaryModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, PdfExtractorService],
  exports: [DocumentsService, PdfExtractorService],
})
export class DocumentsModule {}
