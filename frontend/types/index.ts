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
}

export interface DocumentPage {
  id: string;
  documentId: string;
  pageNumber: number;
  content: string;
  createdAt: string;
}

// ─── Policies ────────────────────────────────────────────────────────────────

export type PolicyVersionStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface Policy extends BaseEntity {
  name: string;
  description: string | null;
  orgId: string;
}

export interface PolicyVersion extends BaseEntity {
  policyId: string;
  versionNumber: number;
  documentId: string;
  status: PolicyVersionStatus;
}

// ─── Requirements ────────────────────────────────────────────────────────────

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Requirement extends BaseEntity {
  policyVersionId: string;
  title: string;
  description: string;
  deadline: string | null;
  priority: Priority;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type ActionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'SKIPPED';

export interface Action extends BaseEntity {
  requirementId: string;
  title: string;
  description: string;
  status: ActionStatus;
  assignedToId: string | null;
  deadline: string | null;
}

export interface ActionHistory {
  id: string;
  actionId: string;
  userId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  createdAt: string;
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
  description: string;
  affectedSection: string | null;
}

export interface Impact extends BaseEntity {
  policyChangeId: string;
  description: string;
  severity: ImpactSeverity;
  status: ImpactStatus;
}

// ─── API Response wrappers ───────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}
