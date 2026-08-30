/**
 * Shared TypeScript types for the Policy Change Impact Engine frontend.
 * These mirror the Prisma schema entities on the backend.
 */

// ─── Common ──────────────────────────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  createdAt: string; // ISO date string
  updatedAt: string;
}

// ─── User & Organization ─────────────────────────────────────────────────────

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
}

export interface User extends BaseEntity {
  email: string;
  name: string;
  orgId: string | null;
}

// ─── Documents ───────────────────────────────────────────────────────────────

export interface Document extends BaseEntity {
  title: string;
  originalName: string;
  mimeType: string;
  storageUrl: string;
  uploadedById: string;
  orgId: string;
  pageCount?: number;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  };
  org?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface DocumentPage {
  id: string;
  documentId: string;
  pageNumber: number;
  content: string;
  createdAt: string;
}

export interface DocumentWithDetails extends Document {
  totalPages?: number;
  pages: DocumentPage[];
  policyVersions?: PolicyVersion[];
}

export interface DocumentUploadResponse extends Document {
  totalPages: number;
  pages: DocumentPage[];
}

// ─── Policies ────────────────────────────────────────────────────────────────

export type PolicyVersionStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface Policy extends BaseEntity {
  name: string;
  description: string | null;
  orgId: string;
  versionCount?: number;
  changeCount?: number;
  totalRequirements?: number;
  latestVersion?: {
    id: string;
    versionNumber: number;
    status: PolicyVersionStatus;
    createdAt: string;
    document?: {
      id: string;
      title: string;
      originalName: string;
      storageUrl: string;
    } | null;
    requirementsCount?: number;
  } | null;
  versions?: PolicyVersion[];
  changes?: PolicyChange[];
  _count?: {
    versions: number;
    changes: number;
  };
}

export interface PolicyVersion extends BaseEntity {
  policyId: string;
  versionNumber: number;
  documentId: string;
  status: PolicyVersionStatus;
  policy?: { id: string; name: string };
  document?: Document;
  requirements?: Requirement[];
  _count?: {
    requirements: number;
    changesFrom?: number;
    changesTo?: number;
  };
}

// ─── Requirements ────────────────────────────────────────────────────────────

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Requirement extends BaseEntity {
  policyVersionId: string;
  title: string;
  description: string;
  deadline: string | null;
  priority: Priority;
  responsibleRole?: string | null;
  evidenceNeeded?: string | null;
  sourcePage?: number | null;
  sourceText?: string | null;
  category?: string | null;
  policyVersion?: {
    id: string;
    versionNumber: number;
    status: PolicyVersionStatus;
    policy?: { id: string; name: string };
  };
  actions?: Action[];
  _count?: {
    actions: number;
  };
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type ActionStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'BLOCKED';

export interface Action extends BaseEntity {
  requirementId: string;
  title: string;
  description: string;
  status: ActionStatus;
  priority: Priority;
  department: string | null;
  assignedToId: string | null;
  deadline: string | null;
  computedStatus?: ActionStatus;
  isOverdue?: boolean;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  } | null;
  requirement?: {
    id: string;
    title: string;
    priority?: Priority;
    deadline?: string | null;
    policyVersionId?: string;
    policyVersion?: {
      id: string;
      versionNumber: number;
      policy?: { id: string; name: string };
      document?: { id: string; title: string; storageUrl: string };
    };
  };
  evidence?: Evidence[];
  history?: ActionHistory[];
  _count?: {
    evidence: number;
    history: number;
  };
}

export interface ActionHistory {
  id: string;
  actionId: string;
  userId: string | null;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface ActionStats {
  totalActions: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  blocked: number;
  skipped: number;
  byPriority: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
}

// ─── Evidence ────────────────────────────────────────────────────────────────

export interface Evidence {
  id: string;
  actionId: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  createdAt: string;
}

// ─── Policy Changes & Impact ─────────────────────────────────────────────────

export type ChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'REORDERED';
export type ImpactSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ImpactStatus = 'IDENTIFIED' | 'ASSESSED' | 'MITIGATED' | 'ACCEPTED';

export interface PolicyChange extends BaseEntity {
  policyId: string;
  fromVersionId: string;
  toVersionId: string;
  changeType: ChangeType;
  fieldChanged?: string | null; // REQUIREMENT, DEADLINE, EVIDENCE, PRIORITY, RESPONSIBILITY
  description: string;
  affectedSection: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  sourceReference?: string | null;
  confidence?: number;
  policy?: { id: string; name: string };
  fromVersion?: { id: string; versionNumber: number; document?: Document };
  toVersion?: { id: string; versionNumber: number; document?: Document };
  impacts?: Impact[];
}

export interface VersionComparisonSummary {
  totalChanges: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  deadlineChangesCount: number;
  evidenceChangesCount: number;
}

export interface PolicyComparisonResponse {
  policyId: string;
  policyName: string;
  fromVersion: {
    id: string;
    versionNumber: number;
    status: PolicyVersionStatus;
    documentTitle?: string;
    documentUrl?: string;
    requirementsCount: number;
    createdAt: string;
  };
  toVersion: {
    id: string;
    versionNumber: number;
    status: PolicyVersionStatus;
    documentTitle?: string;
    documentUrl?: string;
    requirementsCount: number;
    createdAt: string;
  };
  summary: VersionComparisonSummary;
  changes: PolicyChange[];
}

export interface Impact extends BaseEntity {
  policyChangeId: string;
  requirementId?: string | null;
  actionId?: string | null;
  description: string;
  reason?: string | null;
  severity: ImpactSeverity;
  status: ImpactStatus;
  policyChange?: PolicyChange;
  requirement?: {
    id: string;
    title: string;
    description?: string;
    priority: Priority;
    deadline: string | null;
    responsibleRole?: string | null;
    evidenceNeeded?: string | null;
    sourcePage?: number | null;
    actions?: Action[];
  } | null;
  action?: {
    id: string;
    title: string;
    description: string;
    status: ActionStatus;
    priority: Priority;
    department?: string | null;
    assignedToId?: string | null;
    deadline: string | null;
    assignedTo?: { id: string; name: string; email: string } | null;
    evidence?: Evidence[];
  } | null;
}

export interface ImpactStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  criticalAndHigh: number;
  byStatus: {
    identified: number;
    assessed: number;
    mitigated: number;
    accepted: number;
  };
  requirementsAffectedCount: number;
  actionsAffectedCount: number;
}

// ─── API Response wrappers ───────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

// ─── AI Analysis (Sprint 3) ──────────────────────────────────────────────────

export interface ExtractedAction {
  title: string;
  description: string;
  priority: Priority;
  deadline: string | null;
  suggestedOwner: string | null;
}

export interface ExtractedRequirement {
  title: string;
  description: string;
  priority: Priority;
  deadline: string | null;
  responsibleRole: string | null;
  evidenceNeeded: string | null;
  sourcePage: number;
  sourceText: string;
  confidence: number;
  needsReview: boolean;
  suggestedActions: ExtractedAction[];
}

export interface DocumentAnalysisResponse {
  documentId: string;
  documentTitle: string;
  totalPagesAnalyzed: number;
  requirementsCount: number;
  requirements: ExtractedRequirement[];
}

