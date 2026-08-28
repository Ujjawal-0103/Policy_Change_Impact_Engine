import { describe, it, expect } from 'vitest';
import { PdfExtractorService } from './pdf-extractor.service.js';

// Minimal valid 2-page PDF
const SAMPLE_2PAGE_PDF = Buffer.from(
  `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 7 0 R >> >> >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 7 0 R >> >> >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
72 712 Td
(Page 1: Policy Guidelines) Tj
ET
endstream
endobj
6 0 obj
<< /Length 43 >>
stream
BT
/F1 12 Tf
72 712 Td
(Page 2: Action Items) Tj
ET
endstream
endobj
7 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 8
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000120 00000 n 
0000000234 00000 n 
0000000348 00000 n 
0000000441 00000 n 
0000000533 00000 n 
trailer
<< /Size 8 /Root 1 0 R >>
startxref
608
%%EOF`,
);

describe('PdfExtractorService', () => {
  const service = new PdfExtractorService();

  describe('isValidPdfBuffer', () => {
    it('returns true for a buffer starting with %PDF-', () => {
      expect(service.isValidPdfBuffer(SAMPLE_2PAGE_PDF)).toBe(true);
    });

    it('returns false for non-PDF buffer', () => {
      const textBuffer = Buffer.from('Hello world this is not a pdf');
      expect(service.isValidPdfBuffer(textBuffer)).toBe(false);
    });

    it('returns false for empty buffer or buffer < 5 bytes', () => {
      expect(service.isValidPdfBuffer(Buffer.from(''))).toBe(false);
      expect(service.isValidPdfBuffer(Buffer.from('%PDF'))).toBe(false);
    });
  });

  describe('extractPageAwareText', () => {
    it('extracts text from each page preserving page numbers', async () => {
      const result = await service.extractPageAwareText(SAMPLE_2PAGE_PDF);
      expect(result.totalPages).toBe(2);
      expect(result.pages).toHaveLength(2);

      expect(result.pages[0].pageNumber).toBe(1);
      expect(result.pages[0].content).toContain('Page 1: Policy Guidelines');

      expect(result.pages[1].pageNumber).toBe(2);
      expect(result.pages[1].content).toContain('Page 2: Action Items');
    });

    it('throws BadRequestException when buffer is invalid PDF', async () => {
      const invalidBuffer = Buffer.from('invalid data');
      await expect(service.extractPageAwareText(invalidBuffer)).rejects.toThrow(
        /Invalid PDF file format/,
      );
    });
  });
});
