import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiService } from './ai.service.js';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  BadGatewayException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ExtractedPriority } from './dto/analysis-result.dto.js';

describe('AiService', () => {
  let service: AiService;
  let configServiceMock: any;

  beforeEach(() => {
    configServiceMock = {
      get: vi.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') return 'mock-gemini-key';
        if (key === 'GEMINI_MODEL') return 'gemini-3.6-flash';
        return null;
      }),
    };

    service = new AiService(configServiceMock as unknown as ConfigService);
  });

  describe('validateAndTransformResult', () => {
    const validPages = new Set([1, 2]);

    it('successfully validates and transforms well-formed Gemini output', () => {
      const raw = {
        requirements: [
          {
            title: 'Data Encryption at Rest',
            description: 'All customer data must be encrypted with AES-256.',
            priority: 'HIGH',
            deadline: '2026-12-31',
            responsibleRole: 'Security Operations',
            evidenceNeeded: 'KMS Key policies',
            sourcePage: 1,
            sourceText: 'Data at rest shall be encrypted using AES-256.',
            confidence: 0.92,
            needsReview: false,
            suggestedActions: [
              {
                title: 'Audit S3 buckets',
                description: 'Verify encryption status',
                priority: 'HIGH',
                deadline: '2026-06-30',
                suggestedOwner: 'DevOps',
              },
            ],
          },
        ],
      };

      const result = service.validateAndTransformResult(raw, validPages);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Data Encryption at Rest');
      expect(result[0].priority).toBe(ExtractedPriority.HIGH);
      expect(result[0].sourcePage).toBe(1);
      expect(result[0].confidence).toBe(0.92);
      expect(result[0].needsReview).toBe(false);
      expect(result[0].suggestedActions).toHaveLength(1);
    });

    it('enforces needsReview = true when confidence is below 0.75', () => {
      const raw = {
        requirements: [
          {
            title: 'Vague Retention Rule',
            description: 'Logs should be kept for an appropriate duration.',
            priority: 'LOW',
            deadline: null,
            responsibleRole: null,
            evidenceNeeded: null,
            sourcePage: 2,
            sourceText: 'Keep logs as appropriate.',
            confidence: 0.6,
            needsReview: false, // AI claimed false, but confidence < 0.75 must override to true
            suggestedActions: [],
          },
        ],
      };

      const result = service.validateAndTransformResult(raw, validPages);

      expect(result[0].confidence).toBe(0.6);
      expect(result[0].needsReview).toBe(true);
    });

    it('throws BadGatewayException if sourcePage does not exist in analyzed document pages', () => {
      const raw = {
        requirements: [
          {
            title: 'Phantom Requirement',
            description: 'Requirement referring to non-existent page 99.',
            priority: 'MEDIUM',
            sourcePage: 99, // validPages only has 1, 2
            sourceText: 'Some quote',
            confidence: 0.85,
            needsReview: false,
            suggestedActions: [],
          },
        ],
      };

      expect(() =>
        service.validateAndTransformResult(raw, validPages),
      ).toThrow(BadGatewayException);
    });

    it('throws BadGatewayException if raw JSON is missing requirements array', () => {
      expect(() =>
        service.validateAndTransformResult({}, validPages),
      ).toThrow(BadGatewayException);
      expect(() =>
        service.validateAndTransformResult(null, validPages),
      ).toThrow(BadGatewayException);
    });

    it('throws BadGatewayException if requirement is missing title or sourceText', () => {
      const invalidItem = {
        requirements: [
          {
            title: '',
            description: 'Some description',
            sourcePage: 1,
            sourceText: 'Some text',
          },
        ],
      };

      expect(() =>
        service.validateAndTransformResult(invalidItem, validPages),
      ).toThrow(BadGatewayException);
    });
  });

  describe('extractRequirements', () => {
    it('throws BadRequestException if pages array is empty', async () => {
      await expect(service.extractRequirements([])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('runs deterministic requirement extraction if GEMINI_API_KEY is not set', async () => {
      const noKeyConfig = {
        get: vi.fn().mockReturnValue(null),
      };
      const unconfiguredService = new AiService(
        noKeyConfig as unknown as ConfigService,
      );

      const res = await unconfiguredService.extractRequirements([
        {
          pageNumber: 1,
          content: 'All administrative users must enable multi-factor authentication within 30 days.',
        },
      ]);
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].sourcePage).toBe(1);
    });
  });

  describe('comparePolicyVersions', () => {
    const fromReqs = [
      {
        title: 'Password Length Requirement',
        description: 'Passwords must be at least 8 characters in length.',
        priority: 'MEDIUM',
        deadline: '2026-06-30',
        responsibleRole: 'IT Support',
        evidenceNeeded: 'Active Directory policy screenshot',
        sourcePage: 1,
        sourceText: 'Passwords shall be 8 characters long.',
      },
      {
        title: 'Legacy FTP Access',
        description: 'FTP protocol allowed for internal file transfers.',
        priority: 'LOW',
        deadline: null,
        responsibleRole: 'IT Support',
        evidenceNeeded: null,
        sourcePage: 2,
        sourceText: 'FTP is permitted internally.',
      },
    ];

    const toReqs = [
      {
        title: 'Password Length Requirement',
        description: 'Passwords must be at least 14 characters in length with MFA.',
        priority: 'HIGH',
        deadline: '2026-03-31', // Deadline changed
        responsibleRole: 'IT Security',
        evidenceNeeded: 'Okta MFA logs and IAM configuration export', // Evidence changed
        sourcePage: 1,
        sourceText: 'Passwords must be at least 14 characters with MFA mandatory.',
      },
      {
        title: 'Mandatory SOC2 Audit',
        description: 'Annual third-party SOC2 Type II audit report required.',
        priority: 'CRITICAL',
        deadline: '2026-12-31',
        responsibleRole: 'CISO Office',
        evidenceNeeded: 'SOC2 Type II Report',
        sourcePage: 3,
        sourceText: 'An annual SOC2 Type II audit is mandatory.',
      },
    ];

    it('correctly detects added, removed, modified, deadline, and evidence changes via deterministic comparison', () => {
      const changes = service.deterministicComparePolicyVersions(1, fromReqs, 2, toReqs);

      expect(changes.length).toBeGreaterThanOrEqual(4);

      // Check for added requirement
      const added = changes.find((c) => c.changeType === 'ADDED');
      expect(added).toBeDefined();
      expect(added?.affectedSection).toBe('Mandatory SOC2 Audit');
      expect(added?.sourceReference).toContain('v2 Page 3');

      // Check for removed requirement
      const removed = changes.find((c) => c.changeType === 'REMOVED');
      expect(removed).toBeDefined();
      expect(removed?.affectedSection).toBe('Legacy FTP Access');
      expect(removed?.sourceReference).toContain('v1 Page 2');

      // Check for deadline shift
      const deadlineChange = changes.find((c) => c.fieldChanged === 'DEADLINE');
      expect(deadlineChange).toBeDefined();
      expect(deadlineChange?.oldValue).toBe('2026-06-30');
      expect(deadlineChange?.newValue).toBe('2026-03-31');

      // Check for evidence requirement change
      const evidenceChange = changes.find((c) => c.fieldChanged === 'EVIDENCE');
      expect(evidenceChange).toBeDefined();
      expect(evidenceChange?.newValue).toContain('Okta MFA logs');
    });

    it('validates and sanitizes structured Gemini comparison outputs', () => {
      const rawComparison = {
        changes: [
          {
            changeType: 'ADDED',
            fieldChanged: 'REQUIREMENT',
            description: 'Added biometric authentication obligation.',
            affectedSection: 'Section 4.1',
            oldValue: null,
            newValue: 'Biometric MFA is mandatory for production access.',
            sourceReference: 'v2 Page 5: "Biometric MFA required"',
            confidence: 0.95,
            severity: 'HIGH',
          },
        ],
      };

      const validated = service.validateComparisonResult(rawComparison);
      expect(validated).toHaveLength(1);
      expect(validated[0].changeType).toBe('ADDED');
      expect(validated[0].fieldChanged).toBe('REQUIREMENT');
      expect(validated[0].affectedSection).toBe('Section 4.1');
      expect(validated[0].sourceReference).toBe('v2 Page 5: "Biometric MFA required"');
    });
  });
});
