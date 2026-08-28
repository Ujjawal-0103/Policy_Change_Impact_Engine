import {
  Injectable,
  InternalServerErrorException,
  BadGatewayException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ExtractedPriority,
  ExtractedRequirementDto,
  ExtractedActionDto,
  DocumentPageInput,
} from './dto/analysis-result.dto.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly genAI: GoogleGenAI | null = null;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey });
    } else {
      this.logger.warn(
        'GEMINI_API_KEY is not configured. AI extraction requests will fail until configured in .env',
      );
    }

    this.modelName =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.6-flash';
  }

  /**
   * Builds the structured prompt including page-aware segments.
   */
  private buildPrompt(pages: DocumentPageInput[]): string {
    const pagesText = pages
      .map(
        (p) =>
          `=== PAGE ${p.pageNumber} ===\n${p.content.trim()}\n=== END OF PAGE ${p.pageNumber} ===`,
      )
      .join('\n\n');

    return `Please analyze the following policy document text page by page and extract all compliance requirements and actionable obligations:

${pagesText}`;
  }

  /**
   * Defines system instruction for the policy extraction task.
   */
  private getSystemInstruction(): string {
    return `You are an expert enterprise policy compliance analyst and impact assessment AI.
Your task is to analyze the provided policy document text page-by-page and extract structured, actionable compliance requirements.

Guidelines:
1. Extract distinct, actionable requirements, obligations, rules, or procedural mandates.
2. For each requirement:
   - "title": Short, descriptive title of the requirement.
   - "description": Comprehensive, actionable explanation of the requirement and its conditions.
   - "priority": Must be exactly one of: LOW, MEDIUM, HIGH, CRITICAL based on compliance severity and impact.
   - "deadline": Specific completion/compliance date or relative timeframe mentioned in text (or null if none specified).
   - "responsibleRole": Organizational role, team, or department responsible for execution/oversight (or null if unstated).
   - "evidenceNeeded": Specific audit artifact, proof, or log required to substantiate compliance (or null if unstated).
   - "sourcePage": The exact integer page number from the input text where this requirement originates.
   - "sourceText": Verbatim excerpt or close quote from that page's text supporting this requirement.
   - "confidence": Float between 0.0 and 1.0 indicating confidence in extraction clarity.
   - "needsReview": Set to true if confidence is below 0.75, ambiguous language is used, or key obligations are vague.
   - "suggestedActions": Array of concrete implementation actions needed to satisfy this requirement:
     - "title": Action title
     - "description": Action steps
     - "priority": LOW, MEDIUM, HIGH, or CRITICAL
     - "deadline": Suggested deadline or null
     - "suggestedOwner": Suggested owner/role or null

You must strictly output valid JSON adhering to the defined JSON schema.`;
  }

  /**
   * Validates raw parsed JSON from Gemini against application constraints:
   * - Ensures required structure and non-empty values
   * - Validates and normalizes priority enums
   * - Verifies that every sourcePage exists in the analyzed document pages
   * - Enforces needsReview = true whenever confidence < 0.75
   */
  public validateAndTransformResult(
    rawResult: any,
    validPageNumbers: Set<number>,
  ): ExtractedRequirementDto[] {
    if (!rawResult || typeof rawResult !== 'object') {
      throw new BadGatewayException('Gemini returned an empty or invalid JSON response.');
    }

    if (!Array.isArray(rawResult.requirements)) {
      throw new BadGatewayException(
        'Gemini response missing "requirements" array.',
      );
    }

    const validatedRequirements: ExtractedRequirementDto[] = [];
    const validPriorities = new Set(Object.values(ExtractedPriority));

    for (let i = 0; i < rawResult.requirements.length; i++) {
      const item = rawResult.requirements[i];

      if (!item || typeof item !== 'object') {
        throw new BadGatewayException(
          `Invalid requirement object at index ${i}.`,
        );
      }

      const title = typeof item.title === 'string' ? item.title.trim() : '';
      const description =
        typeof item.description === 'string' ? item.description.trim() : '';

      if (!title || !description) {
        throw new BadGatewayException(
          `Requirement at index ${i} is missing title or description.`,
        );
      }

      // Validate priority
      const rawPriority = String(item.priority || '').toUpperCase().trim();
      const priority = validPriorities.has(rawPriority as ExtractedPriority)
        ? (rawPriority as ExtractedPriority)
        : ExtractedPriority.MEDIUM;

      // Validate source page against analyzed document pages
      const sourcePage = Number(item.sourcePage);
      if (!Number.isInteger(sourcePage) || !validPageNumbers.has(sourcePage)) {
        throw new BadGatewayException(
          `Requirement "${title}" references invalid source page ${item.sourcePage}. Valid pages are: ${Array.from(validPageNumbers).join(', ')}.`,
        );
      }

      const sourceText =
        typeof item.sourceText === 'string' ? item.sourceText.trim() : '';
      if (!sourceText) {
        throw new BadGatewayException(
          `Requirement "${title}" on page ${sourcePage} is missing sourceText excerpt.`,
        );
      }

      // Validate and clamp confidence
      let confidence =
        typeof item.confidence === 'number' && !isNaN(item.confidence)
          ? item.confidence
          : 0.8;
      if (confidence < 0) confidence = 0;
      if (confidence > 1) confidence = 1;

      // Enforce needsReview rule: true if confidence < 0.75 or explicitly set
      const needsReview = confidence < 0.75 || Boolean(item.needsReview);

      // Validate suggested actions
      const suggestedActions: ExtractedActionDto[] = [];
      if (Array.isArray(item.suggestedActions)) {
        for (const action of item.suggestedActions) {
          if (action && typeof action === 'object') {
            const actionTitle =
              typeof action.title === 'string' ? action.title.trim() : '';
            const actionDesc =
              typeof action.description === 'string'
                ? action.description.trim()
                : actionTitle;

            if (actionTitle) {
              const rawActionPriority = String(action.priority || '')
                .toUpperCase()
                .trim();
              const actionPriority = validPriorities.has(
                rawActionPriority as ExtractedPriority,
              )
                ? (rawActionPriority as ExtractedPriority)
                : priority;

              suggestedActions.push({
                title: actionTitle,
                description: actionDesc,
                priority: actionPriority,
                deadline:
                  typeof action.deadline === 'string' && action.deadline.trim()
                    ? action.deadline.trim()
                    : null,
                suggestedOwner:
                  typeof action.suggestedOwner === 'string' &&
                  action.suggestedOwner.trim()
                    ? action.suggestedOwner.trim()
                    : null,
              });
            }
          }
        }
      }

      validatedRequirements.push({
        title,
        description,
        priority,
        deadline:
          typeof item.deadline === 'string' && item.deadline.trim()
            ? item.deadline.trim()
            : null,
        responsibleRole:
          typeof item.responsibleRole === 'string' && item.responsibleRole.trim()
            ? item.responsibleRole.trim()
            : null,
        evidenceNeeded:
          typeof item.evidenceNeeded === 'string' && item.evidenceNeeded.trim()
            ? item.evidenceNeeded.trim()
            : null,
        sourcePage,
        sourceText,
        confidence,
        needsReview,
        suggestedActions,
      });
    }

    return validatedRequirements;
  }

  /**
   * Main entry point: Extracts requirements from document pages using Gemini AI.
   * Architecture constraint: Gemini must never access DB or Prisma.
   */
  async extractRequirements(
    pages: DocumentPageInput[],
  ): Promise<ExtractedRequirementDto[]> {
    if (!pages || pages.length === 0) {
      throw new BadRequestException('No document pages provided for AI extraction.');
    }

    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'Gemini API key is not configured on the server. Please set GEMINI_API_KEY in backend/.env',
      );
    }

    const genAI = this.genAI || new GoogleGenAI({ apiKey });
    const validPageNumbers = new Set(pages.map((p) => p.pageNumber));
    const prompt = this.buildPrompt(pages);

    try {
      this.logger.log(
        `Sending ${pages.length} document pages to Gemini model (${this.modelName}) for requirement extraction.`,
      );

      const response = await genAI.models.generateContent({
        model: this.modelName,
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        config: {
          systemInstruction: this.getSystemInstruction(),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              requirements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    priority: {
                      type: Type.STRING,
                      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
                    },
                    deadline: { type: Type.STRING, nullable: true },
                    responsibleRole: { type: Type.STRING, nullable: true },
                    evidenceNeeded: { type: Type.STRING, nullable: true },
                    sourcePage: { type: Type.INTEGER },
                    sourceText: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                    needsReview: { type: Type.BOOLEAN },
                    suggestedActions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          description: { type: Type.STRING },
                          priority: {
                            type: Type.STRING,
                            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
                          },
                          deadline: { type: Type.STRING, nullable: true },
                          suggestedOwner: { type: Type.STRING, nullable: true },
                        },
                        required: ['title', 'description', 'priority'],
                      },
                    },
                  },
                  required: [
                    'title',
                    'description',
                    'priority',
                    'sourcePage',
                    'sourceText',
                    'confidence',
                    'needsReview',
                    'suggestedActions',
                  ],
                },
              },
            },
            required: ['requirements'],
          },
        },
      });

      const responseText = response?.text?.trim();
      if (!responseText) {
        throw new BadGatewayException('Gemini returned an empty response text.');
      }

      let parsedJson: any;
      try {
        parsedJson = JSON.parse(responseText);
      } catch {
        this.logger.error('Failed to parse Gemini JSON response:', responseText);
        throw new BadGatewayException(
          'Gemini returned malformed JSON that could not be parsed.',
        );
      }

      return this.validateAndTransformResult(parsedJson, validPageNumbers);
    } catch (error: any) {
      if (
        error instanceof BadGatewayException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Redact sensitive details from external errors
      const sanitizedMessage = error?.message
        ? String(error.message).replace(/key=[^&\s]+/gi, 'key=[REDACTED]')
        : 'Unknown error occurred during Gemini API call';

      this.logger.error(`Gemini extraction failed: ${sanitizedMessage}`, error?.stack);

      throw new BadGatewayException(
        `Failed to analyze policy document with AI service: ${sanitizedMessage}`,
      );
    }
  }
}
