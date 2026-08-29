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
import {
  ComparisonChangeType,
  ChangedFieldType,
  DetectedChangeDto,
  VersionComparisonResultDto,
  VersionComparisonSummaryDto,
} from './dto/compare-result.dto.js';

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
  /**
   * Deterministic requirement extraction fallback when Gemini AI is not available.
   * Scans document pages for compliance keywords, obligations, rules, and policy mandates.
   */
  public deterministicExtractRequirements(
    pages: DocumentPageInput[],
  ): ExtractedRequirementDto[] {
    const requirements: ExtractedRequirementDto[] = [];
    const keywords = [
      'shall',
      'must',
      'required',
      'mandatory',
      'ensure',
      'prohibited',
      'responsible',
      'compliance',
      'policy',
      'standard',
      'obligation',
      'encrypt',
      'audit',
      'access',
      'security',
      'mfa',
      'backup',
    ];

    for (const page of pages) {
      const text = page.content || '';
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lower = line.toLowerCase();
        const hasKeyword = keywords.some((k) => lower.includes(k));

        if (hasKeyword && line.length >= 15) {
          let priority = ExtractedPriority.MEDIUM;
          if (
            lower.includes('critical') ||
            lower.includes('strict') ||
            lower.includes('zero tolerance')
          ) {
            priority = ExtractedPriority.CRITICAL;
          } else if (
            lower.includes('must') ||
            lower.includes('mandatory') ||
            lower.includes('shall')
          ) {
            priority = ExtractedPriority.HIGH;
          } else if (lower.includes('should') || lower.includes('recommended')) {
            priority = ExtractedPriority.LOW;
          }

          let title = line.split(/[.:;]/)[0]?.trim() || line.slice(0, 60);
          if (title.length > 80) title = title.slice(0, 77) + '...';

          // Avoid duplicate requirement titles
          if (
            requirements.some(
              (r) => r.title.toLowerCase() === title.toLowerCase(),
            )
          ) {
            continue;
          }

          requirements.push({
            title,
            description: line,
            priority,
            deadline: null,
            responsibleRole: lower.includes('admin')
              ? 'Administrator'
              : lower.includes('security') || lower.includes('secops')
                ? 'SecOps Team'
                : null,
            evidenceNeeded: lower.includes('log') || lower.includes('audit')
              ? 'Audit Logs & Verification Records'
              : null,
            sourcePage: page.pageNumber,
            sourceText: line.slice(0, 300),
            confidence: 0.85,
            needsReview: false,
            suggestedActions: [
              {
                title: `Implement ${title}`,
                description: `Establish procedures and controls to fulfill: ${line}`,
                priority,
                deadline: null,
                suggestedOwner: null,
              },
            ],
          });
        }
      }
    }

    return requirements;
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
    const isApiKeyConfigured =
      apiKey && apiKey !== 'your-gemini-api-key' && apiKey.length > 10;

    if (!isApiKeyConfigured) {
      this.logger.log(
        'Gemini API key not configured. Running deterministic requirement extraction.',
      );
      return this.deterministicExtractRequirements(pages);
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

      const validated = this.validateAndTransformResult(
        parsedJson,
        validPageNumbers,
      );
      if (validated.length === 0) {
        return this.deterministicExtractRequirements(pages);
      }
      return validated;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Redact sensitive details from external errors
      const sanitizedMessage = error?.message
        ? String(error.message).replace(/key=[^&\s]+/gi, 'key=[REDACTED]')
        : 'Unknown error occurred during Gemini API call';

      this.logger.warn(
        `Gemini extraction failed: ${sanitizedMessage}. Falling back to deterministic extraction.`,
      );

      return this.deterministicExtractRequirements(pages);
    }
  }

  /**
   * Builds comparison prompt between two policy versions.
   */
  private buildComparisonPrompt(
    policyName: string,
    fromVersionNumber: number,
    fromRequirements: any[],
    toVersionNumber: number,
    toRequirements: any[],
    fromPages?: DocumentPageInput[],
    toPages?: DocumentPageInput[],
  ): string {
    const fromReqsText = fromRequirements
      .map(
        (r, idx) =>
          `[v${fromVersionNumber}-REQ-${idx + 1}] Title: ${r.title}\nDescription: ${r.description}\nPriority: ${r.priority || 'MEDIUM'}\nDeadline: ${r.deadline || 'None'}\nResponsible: ${r.responsibleRole || 'Unstated'}\nEvidence Required: ${r.evidenceNeeded || 'Unstated'}\nSource: Page ${r.sourcePage || 'N/A'}: "${r.sourceText || ''}"`,
      )
      .join('\n\n');

    const toReqsText = toRequirements
      .map(
        (r, idx) =>
          `[v${toVersionNumber}-REQ-${idx + 1}] Title: ${r.title}\nDescription: ${r.description}\nPriority: ${r.priority || 'MEDIUM'}\nDeadline: ${r.deadline || 'None'}\nResponsible: ${r.responsibleRole || 'Unstated'}\nEvidence Required: ${r.evidenceNeeded || 'Unstated'}\nSource: Page ${r.sourcePage || 'N/A'}: "${r.sourceText || ''}"`,
      )
      .join('\n\n');

    let prompt = `Compare the following two versions of policy "${policyName}":\n\n`;
    prompt += `=== BASELINE VERSION: Version ${fromVersionNumber} (FROM) ===\n`;
    prompt += fromReqsText || 'No explicit requirements extracted in baseline version.';
    prompt += `\n\n=== REVISED VERSION: Version ${toVersionNumber} (TO) ===\n`;
    prompt += toReqsText || 'No explicit requirements extracted in revised version.';

    if (toPages && toPages.length > 0) {
      prompt += `\n\n=== REVISED VERSION DOCUMENT PAGES (Reference) ===\n`;
      prompt += toPages
        .slice(0, 10)
        .map((p) => `--- Page ${p.pageNumber} ---\n${p.content.slice(0, 1000)}`)
        .join('\n\n');
    }

    return prompt;
  }

  /**
   * System instruction for version comparison.
   */
  private getComparisonSystemInstruction(): string {
    return `You are an expert enterprise policy auditor and compliance comparison engine.
Your task is to analyze two versions of an organizational policy document (Baseline Version vs Revised Version) and detect ALL meaningful differences and compliance changes.

You must detect and classify each change accurately into:
1. ADDED: New requirements, rules, mandates, or obligations in Revised Version that were NOT in Baseline Version.
2. REMOVED: Requirements or obligations from Baseline Version that have been deleted, repealed, or omitted in Revised Version.
3. MODIFIED: Requirements that exist in both versions but have modified scope, obligations, or wording.
4. DEADLINE: Requirements where completion dates, reporting frequencies (e.g. quarterly to monthly), or grace periods have changed.
5. EVIDENCE: Requirements where required audit artifacts, logs, proofs, or compliance evidence have been altered, added, or removed.
6. RESPONSIBILITY / SCOPE: Departmental ownership, roles, or applicability changes.

Guidelines:
- "changeType": Must be exactly one of: ADDED, REMOVED, MODIFIED, REORDERED.
- "fieldChanged": Must be one of: REQUIREMENT, DEADLINE, EVIDENCE, PRIORITY, RESPONSIBILITY, SCOPE.
- "description": Comprehensive, actionable summary of what changed and its operational compliance impact.
- "affectedSection": Section name, clause number, or requirement title affected.
- "oldValue": Exact requirement, deadline, or evidence text in Baseline Version (or null if ADDED).
- "newValue": Exact requirement, deadline, or evidence text in Revised Version (or null if REMOVED).
- "sourceReference": Specific document source citation (e.g., "v2 Page 3: 'Audits must now be completed within 15 days'") explaining where in the document this change is grounded.
- "confidence": Float between 0.0 and 1.0.
- "severity": Must be exactly one of: LOW, MEDIUM, HIGH, CRITICAL based on operational effort and non-compliance risk.

You must strictly output valid JSON adhering to the defined JSON schema.`;
  }

  /**
   * Validates and cleans comparison output from Gemini.
   */
  public validateComparisonResult(rawResult: any): DetectedChangeDto[] {
    if (!rawResult || typeof rawResult !== 'object') {
      throw new BadGatewayException('Gemini returned an empty or invalid comparison response.');
    }

    if (!Array.isArray(rawResult.changes)) {
      throw new BadGatewayException('Gemini comparison response missing "changes" array.');
    }

    const validChangeTypes = new Set(Object.values(ComparisonChangeType));
    const validSeverities = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
    const validated: DetectedChangeDto[] = [];

    for (let i = 0; i < rawResult.changes.length; i++) {
      const item = rawResult.changes[i];
      if (!item || typeof item !== 'object') continue;

      const description = typeof item.description === 'string' ? item.description.trim() : '';
      if (!description) continue;

      const rawType = String(item.changeType || '').toUpperCase().trim();
      const changeType = validChangeTypes.has(rawType as ComparisonChangeType)
        ? (rawType as ComparisonChangeType)
        : ComparisonChangeType.MODIFIED;

      const fieldChanged =
        typeof item.fieldChanged === 'string' && item.fieldChanged.trim()
          ? item.fieldChanged.trim().toUpperCase()
          : 'REQUIREMENT';

      const rawSeverity = String(item.severity || '').toUpperCase().trim();
      const severity = validSeverities.has(rawSeverity)
        ? (rawSeverity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')
        : 'MEDIUM';

      let confidence = typeof item.confidence === 'number' && !isNaN(item.confidence) ? item.confidence : 0.85;
      if (confidence < 0) confidence = 0;
      if (confidence > 1) confidence = 1;

      validated.push({
        changeType,
        fieldChanged,
        description,
        affectedSection: typeof item.affectedSection === 'string' ? item.affectedSection.trim() : null,
        oldValue: typeof item.oldValue === 'string' ? item.oldValue.trim() : null,
        newValue: typeof item.newValue === 'string' ? item.newValue.trim() : null,
        sourceReference: typeof item.sourceReference === 'string' ? item.sourceReference.trim() : null,
        confidence,
        severity,
      });
    }

    return validated;
  }

  /**
   * Deterministic semantic fallback when Gemini API is unavailable.
   * Compares requirements and page text between versions using normalized string comparison and token similarity.
   */
  public deterministicComparePolicyVersions(
    fromVersionNumber: number,
    fromRequirements: any[],
    toVersionNumber: number,
    toRequirements: any[],
    fromPages?: DocumentPageInput[],
    toPages?: DocumentPageInput[],
  ): DetectedChangeDto[] {
    const changes: DetectedChangeDto[] = [];
    const matchedFromIndices = new Set<number>();
    const matchedToIndices = new Set<number>();

    const normalize = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

    const getSimilarity = (a: string, b: string): number => {
      const wordsA = new Set(normalize(a).split(/\s+/).filter(Boolean));
      const wordsB = new Set(normalize(b).split(/\s+/).filter(Boolean));
      if (wordsA.size === 0 && wordsB.size === 0) return 1.0;
      if (wordsA.size === 0 || wordsB.size === 0) return 0.0;
      let intersection = 0;
      for (const w of wordsA) {
        if (wordsB.has(w)) intersection++;
      }
      return (2 * intersection) / (wordsA.size + wordsB.size);
    };

    // 1. Process each requirement in toVersion (Revised)
    for (let j = 0; j < toRequirements.length; j++) {
      const toReq = toRequirements[j];
      let bestMatchIdx = -1;
      let highestSim = 0;

      for (let i = 0; i < fromRequirements.length; i++) {
        if (matchedFromIndices.has(i)) continue;
        const fromReq = fromRequirements[i];
        const titleSim = getSimilarity(fromReq.title, toReq.title);
        const descSim = getSimilarity(fromReq.description, toReq.description);
        const combinedSim = titleSim * 0.6 + descSim * 0.4;

        if (combinedSim > highestSim) {
          highestSim = combinedSim;
          bestMatchIdx = i;
        }
      }

      if (bestMatchIdx >= 0 && highestSim >= 0.45) {
        matchedFromIndices.add(bestMatchIdx);
        matchedToIndices.add(j);
        const fromReq = fromRequirements[bestMatchIdx];

        // Check deadline change
        const fromDeadline = fromReq.deadline ? String(fromReq.deadline).trim() : null;
        const toDeadline = toReq.deadline ? String(toReq.deadline).trim() : null;
        if (fromDeadline !== toDeadline && (fromDeadline || toDeadline)) {
          changes.push({
            changeType: ComparisonChangeType.MODIFIED,
            fieldChanged: ChangedFieldType.DEADLINE,
            description: `Compliance deadline for "${toReq.title}" changed from ${fromDeadline || 'no deadline'} to ${toDeadline || 'no deadline'}.`,
            affectedSection: toReq.title,
            oldValue: fromDeadline,
            newValue: toDeadline,
            sourceReference: toReq.sourcePage ? `v${toVersionNumber} Page ${toReq.sourcePage}: ${toReq.sourceText || toReq.title}` : null,
            confidence: 0.95,
            severity: 'HIGH',
          });
        }

        // Check evidence requirement change
        const fromEvidence = fromReq.evidenceNeeded ? String(fromReq.evidenceNeeded).trim() : null;
        const toEvidence = toReq.evidenceNeeded ? String(toReq.evidenceNeeded).trim() : null;
        if (fromEvidence !== toEvidence && (fromEvidence || toEvidence)) {
          changes.push({
            changeType: ComparisonChangeType.MODIFIED,
            fieldChanged: ChangedFieldType.EVIDENCE,
            description: `Evidence artifacts required for "${toReq.title}" updated: ${toEvidence || 'None specified'} (previously: ${fromEvidence || 'None'}).`,
            affectedSection: toReq.title,
            oldValue: fromEvidence,
            newValue: toEvidence,
            sourceReference: toReq.sourcePage ? `v${toVersionNumber} Page ${toReq.sourcePage}: ${toReq.sourceText || toReq.title}` : null,
            confidence: 0.9,
            severity: 'MEDIUM',
          });
        }

        // Check priority change
        if (fromReq.priority && toReq.priority && fromReq.priority !== toReq.priority) {
          changes.push({
            changeType: ComparisonChangeType.MODIFIED,
            fieldChanged: ChangedFieldType.PRIORITY,
            description: `Priority for requirement "${toReq.title}" changed from ${fromReq.priority} to ${toReq.priority}.`,
            affectedSection: toReq.title,
            oldValue: fromReq.priority,
            newValue: toReq.priority,
            sourceReference: toReq.sourcePage ? `v${toVersionNumber} Page ${toReq.sourcePage}` : null,
            confidence: 0.95,
            severity: toReq.priority === 'CRITICAL' || toReq.priority === 'HIGH' ? 'HIGH' : 'LOW',
          });
        }

        // Check textual requirement modification
        if (highestSim < 0.92) {
          changes.push({
            changeType: ComparisonChangeType.MODIFIED,
            fieldChanged: ChangedFieldType.REQUIREMENT,
            description: `Requirement "${toReq.title}" was updated in scope and specification.`,
            affectedSection: toReq.title,
            oldValue: fromReq.description,
            newValue: toReq.description,
            sourceReference: toReq.sourcePage ? `v${toVersionNumber} Page ${toReq.sourcePage}: ${toReq.sourceText || toReq.description}` : null,
            confidence: Math.round(highestSim * 100) / 100,
            severity: toReq.priority === 'CRITICAL' ? 'CRITICAL' : toReq.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
          });
        } else if (bestMatchIdx !== j && fromRequirements.length > 1 && toRequirements.length > 1) {
          // Reordering detected without text change
          changes.push({
            changeType: ComparisonChangeType.REORDERED,
            fieldChanged: ChangedFieldType.REQUIREMENT,
            description: `Requirement "${toReq.title}" order changed from position ${bestMatchIdx + 1} to ${j + 1}.`,
            affectedSection: toReq.title,
            oldValue: `Position ${bestMatchIdx + 1}`,
            newValue: `Position ${j + 1}`,
            sourceReference: toReq.sourcePage ? `v${toVersionNumber} Page ${toReq.sourcePage}` : null,
            confidence: 0.9,
            severity: 'LOW',
          });
        }
      } else {
        // New requirement added
        changes.push({
          changeType: ComparisonChangeType.ADDED,
          fieldChanged: ChangedFieldType.REQUIREMENT,
          description: `New compliance requirement added: "${toReq.title}" - ${toReq.description}`,
          affectedSection: toReq.title,
          oldValue: null,
          newValue: `${toReq.title}: ${toReq.description}`,
          sourceReference: toReq.sourcePage ? `v${toVersionNumber} Page ${toReq.sourcePage}: ${toReq.sourceText || toReq.title}` : null,
          confidence: 0.95,
          severity: toReq.priority === 'CRITICAL' ? 'CRITICAL' : toReq.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    // 2. Identify removed requirements from fromVersion
    for (let i = 0; i < fromRequirements.length; i++) {
      if (!matchedFromIndices.has(i)) {
        const fromReq = fromRequirements[i];
        changes.push({
          changeType: ComparisonChangeType.REMOVED,
          fieldChanged: ChangedFieldType.REQUIREMENT,
          description: `Requirement removed: "${fromReq.title}" was deprecated or deleted in version ${toVersionNumber}.`,
          affectedSection: fromReq.title,
          oldValue: `${fromReq.title}: ${fromReq.description}`,
          newValue: null,
          sourceReference: fromReq.sourcePage ? `v${fromVersionNumber} Page ${fromReq.sourcePage}: ${fromReq.sourceText || fromReq.title}` : null,
          confidence: 0.95,
          severity: fromReq.priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    // 3. Document page delta comparison (detect page differences not already reflected in requirement changes)
    if (toPages && toPages.length > 0) {
      const fromPageMap = new Map((fromPages || []).map((p) => [p.pageNumber, p.content]));

      for (const toPage of toPages) {
        const fromContent = fromPageMap.get(toPage.pageNumber);

        if (fromContent === undefined) {
          // New page added in revised version
          const pageTitle =
            toPage.content.split(/[.:\n]/)[0]?.trim() || `Page ${toPage.pageNumber} Section`;
          const alreadyAdded = changes.some(
            (c) =>
              c.changeType === ComparisonChangeType.ADDED &&
              (c.affectedSection?.toLowerCase() === pageTitle.toLowerCase() ||
                c.sourceReference?.includes(`Page ${toPage.pageNumber}`)),
          );

          if (!alreadyAdded) {
            changes.push({
              changeType: ComparisonChangeType.ADDED,
              fieldChanged: ChangedFieldType.REQUIREMENT,
              description: `New mandatory requirement section added in version ${toVersionNumber}: ${toPage.content.trim().slice(0, 150)}`,
              affectedSection: pageTitle.length > 40 ? pageTitle.slice(0, 37) + '...' : pageTitle,
              oldValue: null,
              newValue: toPage.content.trim(),
              sourceReference: `v${toVersionNumber} Page ${toPage.pageNumber}: ${toPage.content.trim().slice(0, 80)}`,
              confidence: 0.95,
              severity: 'HIGH',
            });
          }
        } else if (normalize(fromContent) !== normalize(toPage.content)) {
          // Existing page modified
          const alreadyModified = changes.some(
            (c) =>
              c.changeType === ComparisonChangeType.MODIFIED &&
              c.sourceReference?.includes(`Page ${toPage.pageNumber}`),
          );

          if (!alreadyModified) {
            const sectionTitle =
              toPage.content.split(/[.:\n]/)[0]?.trim() || `Page ${toPage.pageNumber} Section`;
            changes.push({
              changeType: ComparisonChangeType.MODIFIED,
              fieldChanged: ChangedFieldType.REQUIREMENT,
              description: `Updated requirement scope and section text in version ${toVersionNumber}.`,
              affectedSection: sectionTitle.length > 40 ? sectionTitle.slice(0, 37) + '...' : sectionTitle,
              oldValue: fromContent.trim(),
              newValue: toPage.content.trim(),
              sourceReference: `v${toVersionNumber} Page ${toPage.pageNumber}: ${toPage.content.trim().slice(0, 80)}`,
              confidence: 0.95,
              severity: 'MEDIUM',
            });
          }
        }
      }
    }

    return changes;
  }

  /**
   * Compares two policy versions and detects compliance changes, deadline shifts, and evidence updates.
   * Primary engine: Gemini AI structured analysis.
   * Fallback engine: Deterministic semantic comparison.
   */
  async comparePolicyVersions(params: {
    policyName: string;
    fromVersionNumber: number;
    fromRequirements: any[];
    toVersionNumber: number;
    toRequirements: any[];
    fromPages?: DocumentPageInput[];
    toPages?: DocumentPageInput[];
  }): Promise<DetectedChangeDto[]> {
    const {
      policyName,
      fromVersionNumber,
      fromRequirements,
      toVersionNumber,
      toRequirements,
      fromPages,
      toPages,
    } = params;

    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const isApiKeyConfigured = apiKey && apiKey !== 'your-gemini-api-key' && apiKey.length > 10;

    if (!isApiKeyConfigured) {
      this.logger.log(
        'Gemini API key not configured. Running deterministic policy version comparison.',
      );
      return this.deterministicComparePolicyVersions(
        fromVersionNumber,
        fromRequirements,
        toVersionNumber,
        toRequirements,
        fromPages,
        toPages,
      );
    }

    const genAI = this.genAI || new GoogleGenAI({ apiKey });
    const prompt = this.buildComparisonPrompt(
      policyName,
      fromVersionNumber,
      fromRequirements,
      toVersionNumber,
      toRequirements,
      fromPages,
      toPages,
    );

    try {
      this.logger.log(
        `Executing AI policy comparison between v${fromVersionNumber} and v${toVersionNumber} of "${policyName}"`,
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
          systemInstruction: this.getComparisonSystemInstruction(),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              changes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    changeType: {
                      type: Type.STRING,
                      enum: ['ADDED', 'REMOVED', 'MODIFIED', 'REORDERED'],
                    },
                    fieldChanged: {
                      type: Type.STRING,
                      enum: [
                        'REQUIREMENT',
                        'DEADLINE',
                        'EVIDENCE',
                        'PRIORITY',
                        'RESPONSIBILITY',
                        'SCOPE',
                      ],
                    },
                    description: { type: Type.STRING },
                    affectedSection: { type: Type.STRING, nullable: true },
                    oldValue: { type: Type.STRING, nullable: true },
                    newValue: { type: Type.STRING, nullable: true },
                    sourceReference: { type: Type.STRING, nullable: true },
                    confidence: { type: Type.NUMBER },
                    severity: {
                      type: Type.STRING,
                      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
                    },
                  },
                  required: [
                    'changeType',
                    'fieldChanged',
                    'description',
                    'confidence',
                    'severity',
                  ],
                },
              },
            },
            required: ['changes'],
          },
        },
      });

      const responseText = response?.text?.trim();
      if (!responseText) {
        throw new BadGatewayException('Gemini returned empty comparison response.');
      }

      let parsedJson: any;
      try {
        parsedJson = JSON.parse(responseText);
      } catch {
        this.logger.error('Failed to parse Gemini comparison JSON response:', responseText);
        throw new BadGatewayException('Gemini comparison JSON parse failed.');
      }

      const aiChanges = this.validateComparisonResult(parsedJson);

      // If AI returned empty or very few changes, combine with deterministic check to avoid missing obvious changes
      if (aiChanges.length === 0 && (fromRequirements.length > 0 || toRequirements.length > 0 || (toPages && toPages.length > 0))) {
        return this.deterministicComparePolicyVersions(
          fromVersionNumber,
          fromRequirements,
          toVersionNumber,
          toRequirements,
          fromPages,
          toPages,
        );
      }

      return aiChanges;
    } catch (error: any) {
      const sanitizedMessage = error?.message
        ? String(error.message).replace(/key=[^&\s]+/gi, 'key=[REDACTED]')
        : 'Unknown error occurred';

      this.logger.warn(
        `Gemini AI comparison failed: ${sanitizedMessage}. Falling back to deterministic comparison.`,
      );

      return this.deterministicComparePolicyVersions(
        fromVersionNumber,
        fromRequirements,
        toVersionNumber,
        toRequirements,
        fromPages,
        toPages,
      );
    }
  }
}
