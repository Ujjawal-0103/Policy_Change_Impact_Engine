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

    it('throws InternalServerErrorException if GEMINI_API_KEY is not set', async () => {
      const noKeyConfig = {
        get: vi.fn().mockReturnValue(null),
      };
      const unconfiguredService = new AiService(
        noKeyConfig as unknown as ConfigService,
      );

      await expect(
        unconfiguredService.extractRequirements([
          { pageNumber: 1, content: 'Text' },
        ]),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
