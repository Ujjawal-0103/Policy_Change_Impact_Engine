import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ImpactSeverity,
  ImpactStatus,
  ChangeType,
  Priority,
  Prisma,
} from '@prisma/client';
import { FilterImpactDto } from './dto/filter-impact.dto.js';

interface RequirementWithDetails {
  id: string;
  policyVersionId: string;
  title: string;
  description: string;
  deadline: Date | null;
  priority: Priority;
  responsibleRole: string | null;
  evidenceNeeded: string | null;
  sourcePage: number | null;
  sourceText: string | null;
  category: string | null;
  actions: {
    id: string;
    requirementId: string;
    title: string;
    description: string;
    status: string;
    priority: Priority;
    department: string | null;
    assignedToId: string | null;
    deadline: Date | null;
    assignedTo: { id: string; name: string; email: string } | null;
    evidence: { id: string; title: string; fileUrl: string | null }[];
  }[];
}

@Injectable()
export class ImpactService {
  private readonly logger = new Logger(ImpactService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deterministic impact calculation: determines severity and explainable reason.
   */
  private calculateSeverityAndReason(
    change: {
      changeType: ChangeType;
      fieldChanged: string | null;
      description: string;
      affectedSection: string | null;
      oldValue: string | null;
      newValue: string | null;
    },
    requirement?: RequirementWithDetails | null,
    action?: RequirementWithDetails['actions'][0] | null,
  ): { severity: ImpactSeverity; reason: string; description: string } {
    let severity: ImpactSeverity = ImpactSeverity.MEDIUM;
    const reasons: string[] = [];

    const fieldUpper = (change.fieldChanged || '').toUpperCase();
    const descLower = change.description.toLowerCase();
    const isCriticalKeyword =
      descLower.includes('mandatory') ||
      descLower.includes('penalty') ||
      descLower.includes('penalties') ||
      descLower.includes('violation') ||
      descLower.includes('immediate') ||
      descLower.includes('security') ||
      descLower.includes('breach') ||
      descLower.includes('audit') ||
      descLower.includes('regulatory') ||
      descLower.includes('monthly') ||
      descLower.includes('prohibited');

    // 1. Severity Evaluation Rules
    if (
      requirement?.priority === Priority.CRITICAL ||
      action?.priority === Priority.CRITICAL ||
      (isCriticalKeyword && change.changeType !== ChangeType.REORDERED)
    ) {
      severity = ImpactSeverity.CRITICAL;
    } else if (
      requirement?.priority === Priority.HIGH ||
      action?.priority === Priority.HIGH ||
      fieldUpper === 'DEADLINE' ||
      change.changeType === ChangeType.REMOVED ||
      (change.changeType === ChangeType.ADDED && isCriticalKeyword)
    ) {
      severity = ImpactSeverity.HIGH;
    } else if (
      change.changeType === ChangeType.REORDERED ||
      fieldUpper === 'FORMATTING' ||
      (requirement?.priority === Priority.LOW && !isCriticalKeyword)
    ) {
      severity = ImpactSeverity.LOW;
    } else {
      severity = ImpactSeverity.MEDIUM;
    }

    // 2. Explainable Reason Construction
    const changeTypeName = change.changeType.toLowerCase();
    const sectionName = change.affectedSection ? `in section "${change.affectedSection}"` : '';

    if (action && requirement) {
      const ownerInfo = action.assignedTo?.name
        ? `assigned to ${action.assignedTo.name}`
        : action.department
          ? `under ${action.department} department`
          : 'currently unassigned';

      if (fieldUpper === 'DEADLINE') {
        reasons.push(
          `Deadline requirement altered ${sectionName} (${change.description}). Operational action "${action.title}" (${ownerInfo}) requires schedule adjustment and priority review.`,
        );
      } else if (fieldUpper === 'EVIDENCE') {
        reasons.push(
          `Compliance evidence expectation modified ${sectionName}. Existing action "${action.title}" (${ownerInfo}) must verify or update its attached verification artifacts.`,
        );
      } else if (change.changeType === ChangeType.REMOVED) {
        reasons.push(
          `Policy requirement "${requirement.title}" was removed ${sectionName}. Associated action "${action.title}" (${ownerInfo}) should be reviewed for decommission or scope realignment.`,
        );
      } else {
        reasons.push(
          `Policy ${changeTypeName} ${sectionName} affects requirement "${requirement.title}". Existing operational action "${action.title}" (${ownerInfo}) requires review to ensure ongoing compliance.`,
        );
      }
    } else if (requirement) {
      if (change.changeType === ChangeType.ADDED) {
        reasons.push(
          `New policy mandate ${sectionName} created requirement "${requirement.title}". No operational actions are currently linked; new action assignment is recommended.`,
        );
      } else if (change.changeType === ChangeType.REMOVED) {
        reasons.push(
          `Baseline requirement "${requirement.title}" was eliminated in the new version ${sectionName}.`,
        );
      } else {
        reasons.push(
          `Requirement "${requirement.title}" modified ${sectionName}: ${change.description}. Recommended to create or update associated action workflows.`,
        );
      }
    } else {
      reasons.push(
        `General policy change detected ${sectionName}: [${change.changeType}] ${change.description}.`,
      );
    }

    const reason = reasons.join(' ');
    const description = action
      ? `Action Impact: ${action.title} — ${change.description}`
      : requirement
        ? `Requirement Impact: ${requirement.title} — ${change.description}`
        : `Policy Impact: ${change.description}`;

    return { severity, reason, description };
  }

  /**
   * Helper to match requirements related to a policy change.
   */
  private matchAffectedRequirements(
    change: {
      description: string;
      affectedSection: string | null;
      fieldChanged: string | null;
      sourceReference: string | null;
      oldValue: string | null;
      newValue: string | null;
    },
    requirements: RequirementWithDetails[],
  ): RequirementWithDetails[] {
    if (requirements.length === 0) return [];

    const matched = new Set<RequirementWithDetails>();
    const sectionLower = (change.affectedSection || '').toLowerCase();
    const descLower = change.description.toLowerCase();
    const oldValLower = (change.oldValue || '').toLowerCase();
    const newValLower = (change.newValue || '').toLowerCase();
    const sourceLower = (change.sourceReference || '').toLowerCase();

    // Extract significant keywords (longer than 3 letters) from change description
    const keywords = descLower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['must', 'shall', 'from', 'with', 'that', 'this', 'have', 'been', 'were'].includes(w));

    for (const req of requirements) {
      const reqTitleLower = req.title.toLowerCase();
      const reqDescLower = req.description.toLowerCase();
      const reqCatLower = (req.category || '').toLowerCase();
      const reqSourceLower = (req.sourceText || '').toLowerCase();

      // 1. Direct section match
      if (
        sectionLower &&
        (reqTitleLower.includes(sectionLower) ||
          reqCatLower.includes(sectionLower) ||
          reqDescLower.includes(sectionLower))
      ) {
        matched.add(req);
        continue;
      }

      // 2. Source text match
      if (
        sourceLower &&
        (reqSourceLower.includes(sourceLower) || sourceLower.includes(reqTitleLower))
      ) {
        matched.add(req);
        continue;
      }

      // 3. Old / New value match
      if (
        (oldValLower && (reqDescLower.includes(oldValLower) || reqTitleLower.includes(oldValLower))) ||
        (newValLower && (reqDescLower.includes(newValLower) || reqTitleLower.includes(newValLower)))
      ) {
        matched.add(req);
        continue;
      }

      // 4. Keyword overlap match
      let keywordHits = 0;
      for (const kw of keywords) {
        if (reqTitleLower.includes(kw) || reqDescLower.includes(kw)) {
          keywordHits++;
        }
      }

      if (keywordHits >= 2 || (keywords.length <= 2 && keywordHits >= 1)) {
        matched.add(req);
      }
    }

    return Array.from(matched);
  }

  /**
   * Re-analyzes impacts for a single policy change with strict organization ownership check.
   * Prevents uncontrolled duplicates and updates existing impact records idempotently.
   */
  async analyzePolicyChange(changeId: string, orgId: string) {
    const change = await this.prisma.policyChange.findFirst({
      where: { id: changeId, policy: { orgId } },
      include: {
        policy: true,
        fromVersion: {
          include: {
            requirements: {
              include: {
                actions: {
                  include: {
                    assignedTo: { select: { id: true, name: true, email: true } },
                    evidence: { select: { id: true, title: true, fileUrl: true } },
                  },
                },
              },
            },
          },
        },
        toVersion: {
          include: {
            requirements: {
              include: {
                actions: {
                  include: {
                    assignedTo: { select: { id: true, name: true, email: true } },
                    evidence: { select: { id: true, title: true, fileUrl: true } },
                  },
                },
              },
            },
          },
        },
        impacts: true,
      },
    });

    if (!change) {
      throw new NotFoundException(`Policy change with ID "${changeId}" was not found.`);
    }

    // Combine requirements from baseline and target versions
    const allRequirements: RequirementWithDetails[] = [
      ...(change.fromVersion?.requirements || []),
      ...(change.toVersion?.requirements || []),
    ];

    // Deduplicate requirements by ID
    const uniqueReqsMap = new Map<string, RequirementWithDetails>();
    for (const r of allRequirements) {
      if (!uniqueReqsMap.has(r.id)) {
        uniqueReqsMap.set(r.id, r as unknown as RequirementWithDetails);
      }
    }
    const uniqueReqs = Array.from(uniqueReqsMap.values());

    // Detect affected requirements
    let affectedReqs = this.matchAffectedRequirements(change, uniqueReqs);

    // If no specific match was found, and requirements exist, take the most relevant requirement
    if (affectedReqs.length === 0 && uniqueReqs.length > 0) {
      affectedReqs = [uniqueReqs[0]];
    }

    // Existing impacts map to preserve primary key ID and user-managed status during re-analysis
    const existingImpacts = change.impacts || [];
    const existingMap = new Map<string, (typeof existingImpacts)[0]>();
    for (const imp of existingImpacts) {
      const key = `${imp.requirementId || ''}_${imp.actionId || ''}`;
      existingMap.set(key, imp);
    }

    const matchedImpactKeys = new Set<string>();

    if (affectedReqs.length > 0) {
      for (const req of affectedReqs) {
        if (req.actions && req.actions.length > 0) {
          for (const act of req.actions) {
            const { severity, reason, description } = this.calculateSeverityAndReason(
              change,
              req,
              act,
            );
            const key = `${req.id}_${act.id}`;
            matchedImpactKeys.add(key);
            const existing = existingMap.get(key);

            if (existing) {
              await this.prisma.impact.update({
                where: { id: existing.id },
                data: {
                  description,
                  reason,
                  severity,
                  status: existing.status,
                },
              });
            } else {
              await this.prisma.impact.create({
                data: {
                  policyChangeId: change.id,
                  requirementId: req.id,
                  actionId: act.id,
                  description,
                  reason,
                  severity,
                  status: ImpactStatus.IDENTIFIED,
                },
              });
            }
          }
        } else {
          // Requirement affected but has no actions yet
          const { severity, reason, description } = this.calculateSeverityAndReason(
            change,
            req,
            null,
          );
          const key = `${req.id}_`;
          matchedImpactKeys.add(key);
          const existing = existingMap.get(key);

          if (existing) {
            await this.prisma.impact.update({
              where: { id: existing.id },
              data: {
                description,
                reason,
                severity,
                status: existing.status,
              },
            });
          } else {
            await this.prisma.impact.create({
              data: {
                policyChangeId: change.id,
                requirementId: req.id,
                actionId: null,
                description,
                reason,
                severity,
                status: ImpactStatus.IDENTIFIED,
              },
            });
          }
        }
      }
    } else {
      // General impact without specific requirement link
      const { severity, reason, description } = this.calculateSeverityAndReason(
        change,
        null,
        null,
      );
      const key = `_`;
      matchedImpactKeys.add(key);
      const existing = existingMap.get(key);

      if (existing) {
        await this.prisma.impact.update({
          where: { id: existing.id },
          data: {
            description,
            reason,
            severity,
            status: existing.status,
          },
        });
      } else {
        await this.prisma.impact.create({
          data: {
            policyChangeId: change.id,
            requirementId: null,
            actionId: null,
            description,
            reason,
            severity,
            status: ImpactStatus.IDENTIFIED,
          },
        });
      }
    }

    // Clean up any stale impacts from previous analysis that are no longer matched
    for (const [key, imp] of existingMap.entries()) {
      if (!matchedImpactKeys.has(key)) {
        await this.prisma.impact.delete({ where: { id: imp.id } });
      }
    }

    // Return the newly created/updated impacts with full nested relations
    return this.prisma.impact.findMany({
      where: { policyChangeId: change.id },
      include: {
        policyChange: {
          include: {
            policy: { select: { id: true, name: true, orgId: true } },
            fromVersion: { select: { id: true, versionNumber: true } },
            toVersion: { select: { id: true, versionNumber: true } },
          },
        },
        requirement: {
          select: {
            id: true,
            title: true,
            priority: true,
            deadline: true,
            responsibleRole: true,
            evidenceNeeded: true,
            sourcePage: true,
          },
        },
        action: {
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
            evidence: { select: { id: true, title: true, fileUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Retrieves impacts for a specific policy change ID, scoped strictly to organization.
   * If none exist, runs analysis automatically.
   */
  async getImpacts(changeId: string, orgId: string) {
    const change = await this.prisma.policyChange.findFirst({
      where: { id: changeId, policy: { orgId } },
      include: {
        impacts: true,
      },
    });

    if (!change) {
      throw new NotFoundException(`Policy change with ID "${changeId}" was not found.`);
    }

    if (change.impacts.length === 0) {
      return this.analyzePolicyChange(changeId, orgId);
    }

    return this.prisma.impact.findMany({
      where: {
        policyChangeId: changeId,
        policyChange: { policy: { orgId } },
      },
      include: {
        policyChange: {
          include: {
            policy: { select: { id: true, name: true, orgId: true } },
            fromVersion: { select: { id: true, versionNumber: true } },
            toVersion: { select: { id: true, versionNumber: true } },
          },
        },
        requirement: {
          select: {
            id: true,
            title: true,
            priority: true,
            deadline: true,
            responsibleRole: true,
            evidenceNeeded: true,
            sourcePage: true,
          },
        },
        action: {
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
            evidence: { select: { id: true, title: true, fileUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Lists all impacts strictly for the authenticated organization with filters.
   */
  async findAll(filter: FilterImpactDto | undefined, orgId: string) {
    const where: Prisma.ImpactWhereInput = {
      policyChange: {
        policy: { orgId },
      },
    };

    if (filter?.policyId) {
      where.policyChange = {
        policy: { id: filter.policyId, orgId },
      };
    }
    if (filter?.changeId) {
      where.policyChangeId = filter.changeId;
    }
    if (filter?.severity) {
      where.severity = filter.severity;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.search) {
      where.OR = [
        { description: { contains: filter.search, mode: 'insensitive' } },
        { reason: { contains: filter.search, mode: 'insensitive' } },
        {
          requirement: {
            title: { contains: filter.search, mode: 'insensitive' },
          },
        },
        {
          action: {
            title: { contains: filter.search, mode: 'insensitive' },
          },
        },
      ];
    }

    return this.prisma.impact.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        policyChange: {
          include: {
            policy: { select: { id: true, name: true, orgId: true } },
            fromVersion: { select: { id: true, versionNumber: true } },
            toVersion: { select: { id: true, versionNumber: true } },
          },
        },
        requirement: {
          select: {
            id: true,
            title: true,
            priority: true,
            deadline: true,
            responsibleRole: true,
            evidenceNeeded: true,
            sourcePage: true,
          },
        },
        action: {
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
            evidence: { select: { id: true, title: true, fileUrl: true } },
          },
        },
      },
    });
  }

  /**
   * Summary metrics for organization impacts.
   */
  async getStats(orgId: string, policyId?: string) {
    const where: Prisma.ImpactWhereInput = {
      policyChange: { policy: { orgId } },
    };

    if (policyId) {
      where.policyChange = {
        policy: { id: policyId, orgId },
      };
    }

    const impacts = await this.prisma.impact.findMany({
      where,
      select: {
        id: true,
        severity: true,
        status: true,
        requirementId: true,
        actionId: true,
      },
    });

    const critical = impacts.filter((i) => i.severity === ImpactSeverity.CRITICAL).length;
    const high = impacts.filter((i) => i.severity === ImpactSeverity.HIGH).length;
    const medium = impacts.filter((i) => i.severity === ImpactSeverity.MEDIUM).length;
    const low = impacts.filter((i) => i.severity === ImpactSeverity.LOW).length;

    const identified = impacts.filter((i) => i.status === ImpactStatus.IDENTIFIED).length;
    const assessed = impacts.filter((i) => i.status === ImpactStatus.ASSESSED).length;
    const mitigated = impacts.filter((i) => i.status === ImpactStatus.MITIGATED).length;
    const accepted = impacts.filter((i) => i.status === ImpactStatus.ACCEPTED).length;

    const uniqueReqIds = new Set(impacts.map((i) => i.requirementId).filter(Boolean));
    const uniqueActIds = new Set(impacts.map((i) => i.actionId).filter(Boolean));

    return {
      total: impacts.length,
      critical,
      high,
      medium,
      low,
      criticalAndHigh: critical + high,
      byStatus: {
        identified,
        assessed,
        mitigated,
        accepted,
        [ImpactStatus.IDENTIFIED]: identified,
        [ImpactStatus.ASSESSED]: assessed,
        [ImpactStatus.MITIGATED]: mitigated,
        [ImpactStatus.ACCEPTED]: accepted,
      },
      requirementsAffectedCount: uniqueReqIds.size,
      actionsAffectedCount: uniqueActIds.size,
    };
  }

  /**
   * Retrieves a single impact record by ID scoped strictly to organization.
   */
  async getImpactById(id: string, orgId: string) {
    const impact = await this.prisma.impact.findFirst({
      where: {
        id,
        policyChange: { policy: { orgId } },
      },
      include: {
        policyChange: {
          include: {
            policy: true,
            fromVersion: true,
            toVersion: true,
          },
        },
        requirement: {
          include: {
            actions: true,
          },
        },
        action: {
          include: {
            assignedTo: true,
            evidence: true,
          },
        },
      },
    });

    if (!impact) {
      throw new NotFoundException(`Impact record with ID "${id}" was not found.`);
    }

    return impact;
  }

  /**
   * Updates status of an existing impact scoped strictly to organization.
   */
  async updateImpactStatus(id: string, status: ImpactStatus, orgId: string) {
    const existing = await this.prisma.impact.findFirst({
      where: {
        id,
        policyChange: { policy: { orgId } },
      },
      include: { policyChange: { include: { policy: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Impact record with ID "${id}" was not found.`);
    }

    return this.prisma.impact.update({
      where: { id },
      data: { status },
      include: {
        policyChange: {
          include: {
            policy: { select: { id: true, name: true, orgId: true } },
            fromVersion: { select: { id: true, versionNumber: true } },
            toVersion: { select: { id: true, versionNumber: true } },
          },
        },
        requirement: {
          select: {
            id: true,
            title: true,
            priority: true,
            deadline: true,
            responsibleRole: true,
            evidenceNeeded: true,
          },
        },
        action: {
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
            evidence: { select: { id: true, title: true, fileUrl: true } },
          },
        },
      },
    });
  }

  /**
   * Triggers impact analysis for all changes between two policy versions.
   */
  async analyzePolicyVersions(policyId: string, fromVersionId: string, toVersionId: string, orgId: string) {
    const changes = await this.prisma.policyChange.findMany({
      where: {
        policyId,
        fromVersionId,
        toVersionId,
        policy: { orgId },
      },
      select: { id: true },
    });

    if (changes.length === 0) {
      return [];
    }

    const allImpacts = [];
    for (const chg of changes) {
      const impacts = await this.analyzePolicyChange(chg.id, orgId);
      allImpacts.push(...impacts);
    }

    return allImpacts;
  }
}