export enum ComparisonChangeType {
  ADDED = 'ADDED',
  REMOVED = 'REMOVED',
  MODIFIED = 'MODIFIED',
  REORDERED = 'REORDERED',
}

export enum ChangedFieldType {
  REQUIREMENT = 'REQUIREMENT',
  DEADLINE = 'DEADLINE',
  EVIDENCE = 'EVIDENCE',
  PRIORITY = 'PRIORITY',
  RESPONSIBILITY = 'RESPONSIBILITY',
  SCOPE = 'SCOPE',
}

export interface DetectedChangeDto {
  changeType: ComparisonChangeType;
  fieldChanged?: string; // 'REQUIREMENT' | 'DEADLINE' | 'EVIDENCE' | 'PRIORITY' | 'RESPONSIBILITY' | 'SCOPE'
  description: string;
  affectedSection?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  sourceReference?: string | null;
  confidence?: number;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface VersionComparisonSummaryDto {
  totalChanges: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  deadlineChangesCount: number;
  evidenceChangesCount: number;
}

export interface VersionComparisonResultDto {
  policyId: string;
  policyName?: string;
  fromVersionId: string;
  fromVersionNumber: number;
  toVersionId: string;
  toVersionNumber: number;
  summary: VersionComparisonSummaryDto;
  changes: DetectedChangeDto[];
}
