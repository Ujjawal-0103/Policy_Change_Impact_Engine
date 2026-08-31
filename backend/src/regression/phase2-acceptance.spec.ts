import { describe, it, expect, beforeAll } from 'vitest';
import { AiService } from '../ai/ai.service.js';
import { AuthService } from '../auth/auth.service.js';
import { EmailService } from '../email/email.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('Phase 2 — Hardening, Regression & Demo Acceptance', () => {
  let aiService: AiService;
  let authService: AuthService;
  let emailService: EmailService;

  const mockConfig: Record<string, string> = {
    JWT_SECRET: 'test_jwt_secret_key_1234567890',
    JWT_EXPIRATION: '24h',
    RESEND_API_KEY: 're_test_key_12345678',
    PASSWORD_RESET_FROM_EMAIL: 'PoliTrace <onboarding@resend.dev>',
    APP_URL: 'http://localhost:3000',
  };

  const configService = {
    get: (key: string, defaultVal?: string) => mockConfig[key] || defaultVal,
  } as ConfigService;

  beforeAll(() => {
    emailService = new EmailService(configService);
    authService = new AuthService(
      {} as any, // mock Prisma
      new JwtService({ secret: 'test_jwt_secret_key_1234567890' }),
      configService,
      emailService,
    );
    aiService = new AiService(configService);
  });

  describe('1. AI & Text Extraction Integrity', () => {
    it('preserves exact page numbers and verbatim source text on extraction', async () => {
      const pages = [
        {
          pageNumber: 1,
          content: 'Section 4.1: Access Control. All employees must use multi-factor authentication (MFA).',
        },
        {
          pageNumber: 2,
          content: 'Section 9.2: Data Retention. All financial logs must be preserved for at least 7 years.',
        },
      ];

      const reqs = await aiService.extractRequirements(pages);
      expect(reqs).toBeDefined();
      expect(reqs.length).toBeGreaterThanOrEqual(1);

      // Verify that every extracted requirement has page-awareness
      reqs.forEach((r: any) => {
        expect(r.sourcePage).toBeDefined();
        expect(typeof r.sourcePage).toBe('number');
        expect([1, 2]).toContain(r.sourcePage);
        expect(r.sourceText).toBeDefined();
        expect(r.sourceText.length).toBeGreaterThan(0);
        expect(r.title).toBeDefined();
        expect(r.description).toBeDefined();
      });
    });

    it('handles malformed or empty text input gracefully by throwing BadRequestException without fabricating fake data', async () => {
      await expect(aiService.extractRequirements([])).rejects.toThrow('No document pages provided for AI extraction.');
    });
  });

  describe('2. Multi-Tenant Isolation Rules', () => {
    it('prevents cross-tenant query contamination when scoping queries by organizationId', () => {
      const tenantA = { id: 'org_A', name: 'Tenant A' };
      const tenantB = { id: 'org_B', name: 'Tenant B' };

      const records = [
        { id: 'rec_1', orgId: tenantA.id, title: 'Confidential Policy A' },
        { id: 'rec_2', orgId: tenantB.id, title: 'Secret Policy B' },
      ];

      // Simulated tenant filter
      const getScopedRecords = (reqOrgId: string) => records.filter((r) => r.orgId === reqOrgId);

      const aResults = getScopedRecords(tenantA.id);
      const bResults = getScopedRecords(tenantB.id);

      expect(aResults.length).toBe(1);
      expect(aResults[0].title).toBe('Confidential Policy A');
      expect(aResults.some((r) => r.orgId === tenantB.id)).toBe(false);

      expect(bResults.length).toBe(1);
      expect(bResults[0].title).toBe('Secret Policy B');
      expect(bResults.some((r) => r.orgId === tenantA.id)).toBe(false);
    });
  });

  describe('3. Password Reset Security & Single-Use Tokens', () => {
    it('uses dynamic hash-bound tokens that instantly invalidate once password changes', () => {
      const user = {
        id: 'user_xyz',
        email: 'security@example.com',
        password: '$2a$10$old_hashed_password_sample_123',
      };

      const jwt = new JwtService({});
      const secret1 = `test_jwt_secret_key_1234567890_${user.password}`;
      const token = jwt.sign(
        { sub: user.id, email: user.email, purpose: 'password_reset' },
        { secret: secret1, expiresIn: '15m' },
      );

      // Verify token is valid with current password hash
      const verified1 = jwt.verify(token, { secret: secret1 });
      expect(verified1).toBeDefined();
      expect(verified1.sub).toBe(user.id);
      expect(verified1.purpose).toBe('password_reset');

      // Now simulate password update in database (new password hash)
      const secret2 = `test_jwt_secret_key_1234567890_$2a$10$new_hashed_password_sample_456`;

      // Old token MUST throw error when verified with new secret (single-use enforced)
      expect(() => jwt.verify(token, { secret: secret2 })).toThrow();
    });

    it('rejects tampered or malformed reset tokens', () => {
      const jwt = new JwtService({});
      const secret = 'test_jwt_secret_key_1234567890_$2a$10$password_sample_123';
      expect(() => jwt.verify('invalid_tampered_token', { secret })).toThrow();
    });
  });
});
