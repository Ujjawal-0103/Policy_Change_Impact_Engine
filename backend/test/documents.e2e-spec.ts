import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

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
(Page 1: Security Requirements) Tj
ET
endstream
endobj
6 0 obj
<< /Length 43 >>
stream
BT
/F1 12 Tf
72 712 Td
(Page 2: Implementation Steps) Tj
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

describe('Documents End-to-End API Flow', () => {
  let app: INestApplication;
  let inMemoryDocs: any[] = [];
  let inMemoryPages: any[] = [];

  beforeEach(async () => {
    inMemoryDocs = [];
    inMemoryPages = [];

    const mockPrismaService = {
      $connect: vi.fn().mockResolvedValue(undefined),
      $disconnect: vi.fn().mockResolvedValue(undefined),
      organization: {
        findFirst: vi.fn().mockResolvedValue({ id: 'org-test-1', name: 'Test Org', slug: 'default-org' }),
        findUnique: vi.fn().mockResolvedValue({ id: 'org-test-1', name: 'Test Org', slug: 'default-org' }),
        create: vi.fn().mockResolvedValue({ id: 'org-test-1', name: 'Test Org', slug: 'default-org' }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue({ id: 'user-test-1', name: 'Test User', email: 'admin@policyengine.local' }),
        findUnique: vi.fn().mockResolvedValue({ id: 'user-test-1', name: 'Test User', email: 'admin@policyengine.local' }),
        create: vi.fn().mockResolvedValue({ id: 'user-test-1', name: 'Test User', email: 'admin@policyengine.local' }),
      },
      document: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          const docId = `doc-${Date.now()}`;
          const createdPages = (data.pages?.create || []).map((p: any, idx: number) => ({
            id: `page-${idx + 1}`,
            documentId: docId,
            pageNumber: p.pageNumber,
            content: p.content,
            createdAt: new Date(),
          }));
          const doc = {
            id: docId,
            title: data.title,
            originalName: data.originalName,
            mimeType: data.mimeType,
            storageUrl: data.storageUrl,
            uploadedById: data.uploadedById,
            orgId: data.orgId,
            createdAt: new Date(),
            updatedAt: new Date(),
            uploadedBy: { id: data.uploadedById, name: 'Test User', email: 'admin@policyengine.local' },
            org: { id: data.orgId, name: 'Test Org', slug: 'default-org' },
            pages: createdPages,
            _count: { pages: createdPages.length },
          };
          inMemoryDocs.push(doc);
          inMemoryPages.push(...createdPages);
          return doc;
        }),
        findMany: vi.fn().mockImplementation(async () => {
          return inMemoryDocs;
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }) => {
          const doc = inMemoryDocs.find((d) => d.id === where.id);
          if (!doc) return null;
          return {
            ...doc,
            policyVersions: [],
          };
        }),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('1. POST /documents/upload - uploads valid 2-page PDF and extracts text per page', async () => {
    const res = await request(app.getHttpServer())
      .post('/documents/upload')
      .field('title', 'Annual IT Security Policy 2026')
      .attach('file', SAMPLE_2PAGE_PDF, 'annual-security-policy.pdf')
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Annual IT Security Policy 2026');
    expect(res.body.originalName).toBe('annual-security-policy.pdf');
    expect(res.body.mimeType).toBe('application/pdf');
    expect(res.body.storageUrl).toBeDefined();
    expect(res.body.totalPages).toBe(2);
    expect(res.body.pages).toHaveLength(2);

    // Verify page 1 extraction
    expect(res.body.pages[0].pageNumber).toBe(1);
    expect(res.body.pages[0].content).toContain('Page 1: Security Requirements');

    // Verify page 2 extraction
    expect(res.body.pages[1].pageNumber).toBe(2);
    expect(res.body.pages[1].content).toContain('Page 2: Implementation Steps');
  });

  it('2. GET /documents - returns the uploaded documents with page count and metadata', async () => {
    // First upload a document
    await request(app.getHttpServer())
      .post('/documents/upload')
      .field('title', 'Doc 1')
      .attach('file', SAMPLE_2PAGE_PDF, 'policy.pdf')
      .expect(201);

    const listRes = await request(app.getHttpServer())
      .get('/documents')
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body[0]).toHaveProperty('id');
    expect(listRes.body[0]).toHaveProperty('pageCount', 2);
    expect(listRes.body[0]).toHaveProperty('uploadedBy');
    expect(listRes.body[0]).toHaveProperty('org');
  });

  it('3. GET /documents/:id - returns document details and page-aware extracted text', async () => {
    const uploadRes = await request(app.getHttpServer())
      .post('/documents/upload')
      .field('title', 'GDPR Compliance Guide')
      .attach('file', SAMPLE_2PAGE_PDF, 'gdpr.pdf')
      .expect(201);

    const docId = uploadRes.body.id;

    const detailRes = await request(app.getHttpServer())
      .get(`/documents/${docId}`)
      .expect(200);

    expect(detailRes.body.id).toBe(docId);
    expect(detailRes.body.title).toBe('GDPR Compliance Guide');
    expect(detailRes.body.pages).toHaveLength(2);
    expect(detailRes.body.pages[0].pageNumber).toBe(1);
    expect(detailRes.body.pages[0].content).toContain('Page 1: Security Requirements');
  });

  it('4. GET /documents/:id - returns 404 for non-existent document', async () => {
    const res = await request(app.getHttpServer())
      .get('/documents/non-existent-doc-999')
      .expect(404);

    expect(res.body.message).toContain('was not found');
  });

  it('5. POST /documents/upload - rejects non-PDF files with 400 Bad Request', async () => {
    const invalidTextFile = Buffer.from('Plain text file content');

    const res = await request(app.getHttpServer())
      .post('/documents/upload')
      .attach('file', invalidTextFile, 'notes.txt')
      .expect(400);

    expect(res.body.message).toMatch(/(Invalid file type|corrupted|not a valid PDF)/i);
  });

  it('6. POST /documents/upload - rejects request when no file is attached', async () => {
    const res = await request(app.getHttpServer())
      .post('/documents/upload')
      .field('title', 'No file')
      .expect(400);

    expect(res.body.message).toMatch(/(No PDF file uploaded|File is required)/i);
  });
});
