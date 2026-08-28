import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { extractText } from 'unpdf';

export interface ExtractedPage {
  pageNumber: number;
  content: string;
}

export interface PdfExtractionResult {
  totalPages: number;
  pages: ExtractedPage[];
}

@Injectable()
export class PdfExtractorService {
  private readonly logger = new Logger(PdfExtractorService.name);

  /**
   * Validates whether a file buffer starts with PDF magic bytes (%PDF-).
   */
  isValidPdfBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 5) {
      return false;
    }
    // Check for %PDF- header (0x25 0x50 0x44 0x46 0x2D)
    const header = buffer.subarray(0, 5).toString('ascii');
    return header.startsWith('%PDF-');
  }

  /**
   * Extracts text from a PDF buffer page by page.
   */
  async extractPageAwareText(buffer: Buffer): Promise<PdfExtractionResult> {
    if (!this.isValidPdfBuffer(buffer)) {
      throw new BadRequestException('Invalid PDF file format. Missing %PDF header.');
    }

    try {
      // unpdf accepts Uint8Array / Buffer and supports mergePages: false
      const result = await extractText(new Uint8Array(buffer), { mergePages: false });
      const rawPages = Array.isArray(result.text) ? result.text : [result.text];
      const totalPages = result.totalPages || rawPages.length || 1;

      const pages: ExtractedPage[] = rawPages.map((pageText, index) => ({
        pageNumber: index + 1,
        content: typeof pageText === 'string' ? pageText.trim() : '',
      }));

      this.logger.log(
        `Successfully extracted text from ${totalPages} pages.`,
      );

      return {
        totalPages,
        pages,
      };
    } catch (error) {
      this.logger.error(`PDF extraction failed: ${(error as Error).message}`);
      throw new BadRequestException(
        `Failed to parse PDF and extract text: ${(error as Error).message}`,
      );
    }
  }
}
