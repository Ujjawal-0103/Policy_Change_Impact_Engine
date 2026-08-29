import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { PdfExtractorService } from './pdf-extractor.service.js';
import { AiService } from '../ai/ai.service.js';
import { DocumentAnalysisResponseDto } from '../ai/dto/analysis-result.dto.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import 'multer';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly pdfExtractorService: PdfExtractorService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Handles PDF upload, validation, Cloudinary storage, page-aware text extraction,
   * and database persistence scoped strictly to the authenticated user and organization.
   */
  async upload(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    user: AuthenticatedUser,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No PDF file uploaded.');
    }

    // Validate MIME type and file extension
    const isMimePdf =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/x-pdf';
    const isExtPdf = file.originalname?.toLowerCase().endsWith('.pdf');

    if (!isMimePdf && !isExtPdf) {
      throw new BadRequestException(
        'Invalid file type. Only PDF documents (.pdf) are supported.',
      );
    }

    // Validate PDF magic bytes (%PDF-)
    if (!this.pdfExtractorService.isValidPdfBuffer(file.buffer)) {
      throw new BadRequestException(
        'Invalid PDF content. The file is corrupted or not a valid PDF.',
      );
    }

    this.logger.log(
      `Processing PDF upload for Org ${user.orgId} by User ${user.userId}: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)`,
    );

    // 1. Upload to Cloudinary
    const uploadResult = await this.cloudinaryService.uploadPdf(file);

    // 2. Extract page-aware text
    const extractionResult =
      await this.pdfExtractorService.extractPageAwareText(file.buffer);

    // 3. Derive document title
    const computedTitle =
      dto.title?.trim() ||
      file.originalname.replace(/\.[^/.]+$/, '').trim() ||
      'Untitled Policy Document';

    // 4. Transactionally save Document and DocumentPages with STRICT ownership
    const document = await this.prisma.document.create({
      data: {
        title: computedTitle,
        originalName: file.originalname,
        mimeType: file.mimetype || 'application/pdf',
        storageUrl: uploadResult.url,
        uploadedById: user.userId,
        orgId: user.orgId,
        pages: {
          create: extractionResult.pages.map((p) => ({
            pageNumber: p.pageNumber,
            content: p.content,
          })),
        },
      },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
        org: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    this.logger.log(
      `Document "${document.title}" saved successfully with ID ${document.id} for Org ${user.orgId}.`,
    );

    return {
      id: document.id,
      title: document.title,
      originalName: document.originalName,
      mimeType: document.mimeType,
      storageUrl: document.storageUrl,
      uploadedById: document.uploadedById,
      orgId: document.orgId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      uploadedBy: document.uploadedBy,
      org: document.org,
      totalPages: document.pages.length,
      pages: document.pages,
    };
  }

  /**
   * Retrieves all documents for the specified organization.
   */
  async findAll(orgId: string) {
    const documents = await this.prisma.document.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { pages: true },
        },
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
        org: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      storageUrl: doc.storageUrl,
      uploadedById: doc.uploadedById,
      orgId: doc.orgId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      uploadedBy: doc.uploadedBy,
      org: doc.org,
      pageCount: doc._count.pages,
    }));
  }

  /**
   * Retrieves a single document by ID belonging strictly to the organization.
   */
  async findOne(id: string, orgId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, orgId },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
        org: {
          select: { id: true, name: true, slug: true },
        },
        policyVersions: {
          select: { id: true, versionNumber: true, status: true, policyId: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID "${id}" was not found.`);
    }

    return {
      id: document.id,
      title: document.title,
      originalName: document.originalName,
      mimeType: document.mimeType,
      storageUrl: document.storageUrl,
      uploadedById: document.uploadedById,
      orgId: document.orgId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      uploadedBy: document.uploadedBy,
      org: document.org,
      pageCount: document.pages.length,
      pages: document.pages,
      policyVersions: document.policyVersions,
    };
  }

  /**
   * Analyzes the extracted text of an organization's document with Gemini AI.
   */
  async analyze(id: string, orgId: string): Promise<DocumentAnalysisResponseDto> {
    const document = await this.prisma.document.findFirst({
      where: { id, orgId },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID "${id}" was not found.`);
    }

    const usablePages = document.pages.filter(
      (page) => page.content && page.content.trim().length > 0,
    );

    if (usablePages.length === 0) {
      throw new BadRequestException(
        `Document "${document.title}" has no pages with usable extracted text to analyze.`,
      );
    }

    const pageInputs = usablePages.map((p) => ({
      pageNumber: p.pageNumber,
      content: p.content,
    }));

    const requirements = await this.aiService.extractRequirements(pageInputs);

    return {
      documentId: document.id,
      documentTitle: document.title,
      totalPagesAnalyzed: usablePages.length,
      requirementsCount: requirements.length,
      requirements,
    };
  }
}
