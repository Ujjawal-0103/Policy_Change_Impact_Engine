import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let serviceMock: Partial<Record<keyof DocumentsService, any>>;

  const mockUser: AuthenticatedUser = {
    userId: 'user_1',
    orgId: 'org_1',
    email: 'admin@test.com',
    name: 'Admin',
  };

  beforeEach(() => {
    serviceMock = {
      upload: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      analyze: vi.fn(),
    };

    controller = new DocumentsController(
      serviceMock as unknown as DocumentsService,
    );
  });

  describe('upload', () => {
    it('throws BadRequestException if no file is provided', async () => {
      await expect(
        controller.upload(null as any, { title: 'Test' }, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('delegates to service.upload with file and DTO', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        buffer: Buffer.from('%PDF-1.4'),
      } as Express.Multer.File;

      const mockResponse = {
        id: 'doc_1',
        title: 'My Policy',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        storageUrl: 'https://cloudinary.com/policy.pdf',
        uploadedById: 'user_1',
        orgId: 'org_1',
        createdAt: new Date(),
        updatedAt: new Date(),
        uploadedBy: { id: 'user_1', name: 'Admin', email: 'admin@test.com' },
        org: { id: 'org_1', name: 'Org', slug: 'org' },
        totalPages: 1,
        pages: [{ pageNumber: 1, content: 'Text' }],
      };

      serviceMock.upload.mockResolvedValue(mockResponse);

      const result = await controller.upload(mockFile, { title: 'My Policy' }, mockUser);

      expect(serviceMock.upload).toHaveBeenCalledWith(mockFile, {
        title: 'My Policy',
      }, mockUser);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findAll', () => {
    it('delegates to service.findAll with orgId', async () => {
      serviceMock.findAll.mockResolvedValue([]);
      const result = await controller.findAll(mockUser);
      expect(serviceMock.findAll).toHaveBeenCalledWith(mockUser.orgId);
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('delegates to service.findOne with id and orgId', async () => {
      const mockDoc = { id: 'doc_123', title: 'Test' };
      serviceMock.findOne.mockResolvedValue(mockDoc);

      const result = await controller.findOne('doc_123', mockUser);
      expect(serviceMock.findOne).toHaveBeenCalledWith('doc_123', mockUser.orgId);
      expect(result).toEqual(mockDoc);
    });
  });

  describe('analyze', () => {
    it('delegates to service.analyze with document id and orgId', async () => {
      const mockAnalysis = {
        documentId: 'doc_123',
        documentTitle: 'Test Document',
        totalPagesAnalyzed: 1,
        requirementsCount: 1,
        requirements: [],
      };
      serviceMock.analyze.mockResolvedValue(mockAnalysis);

      const result = await controller.analyze('doc_123', mockUser);
      expect(serviceMock.analyze).toHaveBeenCalledWith('doc_123', mockUser.orgId);
      expect(result).toEqual(mockAnalysis);
    });
  });
});
