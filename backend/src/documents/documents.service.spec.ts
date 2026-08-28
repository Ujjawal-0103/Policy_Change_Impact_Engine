import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentsService } from './documents.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { PdfExtractorService } from './pdf-extractor.service.js';
import { AiService } from '../ai/ai.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prismaMock: any;
  let cloudinaryMock: any;
  let pdfExtractorMock: any;
  let aiServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      organization: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      document: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    cloudinaryMock = {
      uploadPdf: vi.fn(),
    };

    pdfExtractorMock = {
      isValidPdfBuffer: vi.fn(),
      extractPageAwareText: vi.fn(),
    };

    aiServiceMock = {
      extractRequirements: vi.fn(),
    };

    service = new DocumentsService(
      prismaMock as unknown as PrismaService,
      cloudinaryMock as unknown as CloudinaryService,
      pdfExtractorMock as unknown as PdfExtractorService,
      aiServiceMock as unknown as AiService,
    );
  });

  describe('upload', () => {
    it('throws BadRequestException if no file provided', async () => {
      await expect(service.upload(null as any, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if file is not a PDF', async () => {
      const file = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        buffer: Buffer.from('hello'),
        size: 5,
      } as Express.Multer.File;

      await expect(service.upload(file, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if PDF buffer is invalid', async () => {
      const file = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('not real pdf'),
        size: 12,
      } as Express.Multer.File;

      pdfExtractorMock.isValidPdfBuffer.mockReturnValue(false);

      await expect(service.upload(file, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('successfully uploads and stores document and pages', async () => {
      const file = {
        originalname: 'security-policy.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.7 dummy content'),
        size: 1024,
      } as Express.Multer.File;

      pdfExtractorMock.isValidPdfBuffer.mockReturnValue(true);
      cloudinaryMock.uploadPdf.mockResolvedValue({
        url: 'https://cloudinary.com/policy.pdf',
        publicId: 'policy_123',
      });
      pdfExtractorMock.extractPageAwareText.mockResolvedValue({
        totalPages: 2,
        pages: [
          { pageNumber: 1, content: 'Page 1 text' },
          { pageNumber: 2, content: 'Page 2 text' },
        ],
      });

      prismaMock.organization.findFirst.mockResolvedValue({
        id: 'org_1',
        name: 'Default Org',
        slug: 'default-org',
      });
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user_1',
        name: 'Admin User',
        email: 'admin@policyengine.local',
      });

      const mockCreatedDoc = {
        id: 'doc_1',
        title: 'Custom Title',
        originalName: 'security-policy.pdf',
        mimeType: 'application/pdf',
        storageUrl: 'https://cloudinary.com/policy.pdf',
        uploadedById: 'user_1',
        orgId: 'org_1',
        createdAt: new Date(),
        updatedAt: new Date(),
        uploadedBy: { id: 'user_1', name: 'Admin User', email: 'admin@policyengine.local' },
        org: { id: 'org_1', name: 'Default Org', slug: 'default-org' },
        pages: [
          { id: 'p1', documentId: 'doc_1', pageNumber: 1, content: 'Page 1 text', createdAt: new Date() },
          { id: 'p2', documentId: 'doc_1', pageNumber: 2, content: 'Page 2 text', createdAt: new Date() },
        ],
      };

      prismaMock.document.create.mockResolvedValue(mockCreatedDoc);

      const result = await service.upload(file, { title: 'Custom Title' });

      expect(result.id).toBe('doc_1');
      expect(result.title).toBe('Custom Title');
      expect(result.totalPages).toBe(2);
      expect(result.pages).toHaveLength(2);
      expect(prismaMock.document.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns a list of formatted documents', async () => {
      prismaMock.document.findMany.mockResolvedValue([
        {
          id: 'doc_1',
          title: 'Doc 1',
          originalName: 'doc1.pdf',
          mimeType: 'application/pdf',
          storageUrl: 'https://storage.url/1',
          uploadedById: 'user_1',
          orgId: 'org_1',
          createdAt: new Date(),
          updatedAt: new Date(),
          uploadedBy: { id: 'user_1', name: 'User 1', email: 'user1@test.com' },
          org: { id: 'org_1', name: 'Org 1', slug: 'org-1' },
          _count: { pages: 3 },
        },
      ]);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].pageCount).toBe(3);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException if document does not exist', async () => {
      prismaMock.document.findUnique.mockResolvedValue(null);
      await expect(service.findOne('non_existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns document with pages when found', async () => {
      const mockDoc = {
        id: 'doc_1',
        title: 'Doc 1',
        originalName: 'doc1.pdf',
        mimeType: 'application/pdf',
        storageUrl: 'https://storage.url/1',
        uploadedById: 'user_1',
        orgId: 'org_1',
        createdAt: new Date(),
        updatedAt: new Date(),
        uploadedBy: { id: 'user_1', name: 'User 1', email: 'user1@test.com' },
        org: { id: 'org_1', name: 'Org 1', slug: 'org-1' },
        pages: [{ id: 'p1', pageNumber: 1, content: 'Text' }],
        policyVersions: [],
      };
      prismaMock.document.findUnique.mockResolvedValue(mockDoc);

      const result = await service.findOne('doc_1');
      expect(result.id).toBe('doc_1');
      expect(result.pageCount).toBe(1);
      expect(result.pages).toHaveLength(1);
    });
  });

  describe('analyze', () => {
    it('throws NotFoundException if document does not exist', async () => {
      prismaMock.document.findUnique.mockResolvedValue(null);
      await expect(service.analyze('non_existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException if document has no usable pages', async () => {
      prismaMock.document.findUnique.mockResolvedValue({
        id: 'doc_1',
        title: 'Empty Policy',
        pages: [{ pageNumber: 1, content: '   ' }],
      });

      await expect(service.analyze('doc_1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('successfully extracts requirements and returns analysis without DB writes', async () => {
      prismaMock.document.findUnique.mockResolvedValue({
        id: 'doc_1',
        title: 'Security Policy',
        pages: [
          { pageNumber: 1, content: 'Section 1: MFA is mandatory.' },
          { pageNumber: 2, content: 'Section 2: Annual audits required.' },
        ],
      });

      const mockRequirements = [
        {
          title: 'Mandatory MFA',
          description: 'MFA is mandatory.',
          priority: 'HIGH',
          deadline: null,
          responsibleRole: 'IT Security',
          evidenceNeeded: 'MFA logs',
          sourcePage: 1,
          sourceText: 'MFA is mandatory.',
          confidence: 0.95,
          needsReview: false,
          suggestedActions: [
            {
              title: 'Enable MFA',
              description: 'Configure SSO provider',
              priority: 'HIGH',
              deadline: null,
              suggestedOwner: 'IT Admin',
            },
          ],
        },
      ];

      aiServiceMock.extractRequirements.mockResolvedValue(mockRequirements);

      const result = await service.analyze('doc_1');

      expect(aiServiceMock.extractRequirements).toHaveBeenCalledWith([
        { pageNumber: 1, content: 'Section 1: MFA is mandatory.' },
        { pageNumber: 2, content: 'Section 2: Annual audits required.' },
      ]);
      expect(result).toEqual({
        documentId: 'doc_1',
        documentTitle: 'Security Policy',
        totalPagesAnalyzed: 2,
        requirementsCount: 1,
        requirements: mockRequirements,
      });
      // Ensure no db write methods were called
      expect(prismaMock.document.create).not.toHaveBeenCalled();
    });
  });
});

