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
   * Validates and resolves an active User and Organization for foreign key relations.
   * If not found or provided, finds or seeds a default organization and system user.
   */
  private async resolveUserAndOrg(
    dto: UploadDocumentDto,
  ): Promise<{ userId: string; orgId: string }> {
    if (dto.uploadedById && dto.orgId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.uploadedById },
      });
      const org = await this.prisma.organization.findUnique({
        where: { id: dto.orgId },
      });
      if (user && org) {
        return { userId: user.id, orgId: org.id };
      }
    }

    // Find or create default organization
    let defaultOrg = await this.prisma.organization.findFirst({
      where: { slug: 'default-org' },
    });
    if (!defaultOrg) {
      defaultOrg = await this.prisma.organization.create({
        data: {
          name: 'Default Organization',
          slug: 'default-org',
        },
      });
    }

    // Find or create default system user
    let defaultUser = await this.prisma.user.findFirst({
      where: { email: 'admin@policyengine.local' },
    });
    if (!defaultUser) {
      defaultUser = await this.prisma.user.create({
        data: {
          name: 'System Admin',
          email: 'admin@policyengine.local',
          password: 'system_default_password_hash',
          orgId: defaultOrg.id,
        },
      });
    }

    return {
      userId: dto.uploadedById || defaultUser.id,
      orgId: dto.orgId || defaultOrg.id,
    };
  }

  /**
   * Handles PDF upload, validation, Cloudinary storage, page-aware text extraction,
   * and database persistence.
   */
  async upload(file: Express.Multer.File, dto: UploadDocumentDto) {
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
      `Processing PDF upload: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)`,
    );

    // 1. Upload to Cloudinary
    const uploadResult = await this.cloudinaryService.uploadPdf(file);

    // 2. Extract page-aware text
    const extractionResult =
      await this.pdfExtractorService.extractPageAwareText(file.buffer);

    // 3. Resolve user and org
    const { userId, orgId } = await this.resolveUserAndOrg(dto);

    // 4. Derive document title
    const computedTitle =
      dto.title?.trim() ||
      file.originalname.replace(/\.[^/.]+$/, '').trim() ||
      'Untitled Policy Document';

    // 5. Transactionally save Document and DocumentPages
    const document = await this.prisma.document.create({
      data: {
        title: computedTitle,
        originalName: file.originalname,
        mimeType: file.mimetype || 'application/pdf',
        storageUrl: uploadResult.url,
        uploadedById: userId,
        orgId: orgId,
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
      `Document "${document.title}" saved successfully with ID ${document.id} and ${document.pages.length} pages.`,
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
   * Retrieves all documents with page counts and relations.
   */
  async findAll() {
    const documents = await this.prisma.document.findMany({
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
   * Retrieves a single document by ID including its page-aware extracted text.
   */
  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
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
   * Analyzes the extracted text of a document with Gemini AI to extract
   * requirements, suggested actions, responsibilities, and deadlines.
   * Does not persist analysis to the database in Sprint 3.
   */
  async analyze(id: string): Promise<DocumentAnalysisResponseDto> {
    const document = await this.prisma.document.findUnique({
      where: { id },
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

