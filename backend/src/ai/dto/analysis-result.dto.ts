export enum ExtractedPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ExtractedActionDto {
  title: string;
  description: string;
  priority: ExtractedPriority;
  deadline: string | null;
  suggestedOwner: string | null;
}

export interface ExtractedRequirementDto {
  title: string;
  description: string;
  priority: ExtractedPriority;
  deadline: string | null;
  responsibleRole: string | null;
  evidenceNeeded: string | null;
  sourcePage: number;
  sourceText: string;
  confidence: number;
  needsReview: boolean;
  suggestedActions: ExtractedActionDto[];
}

export interface DocumentAnalysisResponseDto {
  documentId: string;
  documentTitle: string;
  totalPagesAnalyzed: number;
  requirementsCount: number;
  requirements: ExtractedRequirementDto[];
}

export interface DocumentPageInput {
  pageNumber: number;
  content: string;
}
