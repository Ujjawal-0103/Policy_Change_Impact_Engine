import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AiService } from '../ai/ai.service.js';
import { CreatePolicyDto } from './dto/create-policy.dto.js';
import { CreateVersionDto } from './dto/create-version.dto.js';
import { CompareVersionsDto } from './dto/compare-versions.dto.js';
import {
  PolicyVersionStatus,
  ChangeType,
  Priority,
  ImpactSeverity,
  ImpactStatus,
} from '@prisma/client';
import { ComparisonChangeType } from '../ai/dto/compare-result.dto.js';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Helper: Resolves active organization ID or creates default.
   */
  private async resolveOrg(orgId?: string): Promise<string> {
    if (orgId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
      });
      if (org) return org.id;
    }

    let defaultOrg = await this.prisma.organization.findFirst({
      where: { slug: 'default-org' },
    });
    if (!defaultOrg) {
      defaultOrg = await this.prisma.organization.create({
        data: {
          name: 'Default Organization',
          slug: 'default-org',
        },
      });
    }
    return defaultOrg.id;
  }

  /**
   * Helper to map extracted AI requirements to Prisma requirements for a version.
   */
  private async extractAndSaveRequirements(
    policyVersionId: string,
    documentId: string,
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        pages: { orderBy: { pageNumber: 'asc' } },
      },
    });

    if (!document || !document.pages || document.pages.length === 0) {
      return [];
    }

    const usablePages = document.pages.filter(
      (p) => p.content && p.content.trim().length > 0,
    );
    if (usablePages.length === 0) return [];

    try {
      const pageInputs = usablePages.map((p) => ({
        pageNumber: p.pageNumber,
        content: p.content,
      }));

      const extracted = await this.aiService.extractRequirements(pageInputs);

      const createdRequirements = await Promise.all(
        extracted.map((req) => {
          let reqPriority: Priority = Priority.MEDIUM;
          if (req.priority === 'CRITICAL') reqPriority = Priority.CRITICAL;
          else if (req.priority === 'HIGH') reqPriority = Priority.HIGH;
          else if (req.priority === 'LOW') reqPriority = Priority.LOW;

          let deadlineDate: Date | null = null;
          if (req.deadline) {
            const parsed = new Date(req.deadline);
            if (!isNaN(parsed.getTime())) {
              deadlineDate = parsed;
            }
          }

          return this.prisma.requirement.create({
            data: {
              policyVersionId,
              title: req.title,
              description: req.description,
              priority: reqPriority,
              deadline: deadlineDate,
              responsibleRole: req.responsibleRole,
              evidenceNeeded: req.evidenceNeeded,
              sourcePage: req.sourcePage,
              sourceText: req.sourceText,
            },
          });
        }),
      );

      this.logger.log(
        `Persisted ${createdRequirements.length} requirements for version ${policyVersionId}`,
      );
      return createdRequirements;
    } catch (err: any) {
      this.logger.warn(
        `Automated requirement extraction skipped or failed for version ${policyVersionId}: ${err?.message}`,
      );
      return [];
    }
  }

  /**
   * Creates a new policy and optionally registers Version 1 if documentId is provided.
   */
  async create(dto: CreatePolicyDto) {
    const orgId = await this.resolveOrg(dto.orgId);

    const policy = await this.prisma.policy.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        orgId,
      },
    });

    let version1 = null;
    if (dto.documentId) {
      const document = await this.prisma.document.findUnique({
        where: { id: dto.documentId },
      });
      if (document) {
        version1 = await this.prisma.policyVersion.create({
          data: {
            policyId: policy.id,
            versionNumber: 1,
            documentId: document.id,
            status: PolicyVersionStatus.ACTIVE,
          },
          include: {
            document: true,
          },
        });

        // Trigger requirement extraction for version 1
        await this.extractAndSaveRequirements(version1.id, document.id);
      }
    }

    return this.findOne(policy.id);
  }

  /**
   * Retrieves all policies with version counts, latest version info, and requirements.
   */
  async findAll() {
    const policies = await this.prisma.policy.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            document: {
              select: {
                id: true,
                title: true,
                originalName: true,
                storageUrl: true,
              },
            },
            _count: {
              select: {
                requirements: true,
              },
            },
          },
        },
        _count: {
          select: {
            versions: true,
            changes: true,
          },
        },
      },
    });

    return policies.map((policy) => {
      const latestVersion = policy.versions[0] || null;
      const totalRequirements = policy.versions.reduce(
        (sum, v) => sum + v._count.requirements,
        0,
      );

      return {
        id: policy.id,
        name: policy.name,
        description: policy.description,
        orgId: policy.orgId,
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt,
        versionCount: policy._count.versions,
        changeCount: policy._count.changes,
        totalRequirements,
        latestVersion: latestVersion
          ? {
              id: latestVersion.id,
              versionNumber: latestVersion.versionNumber,
              status: latestVersion.status,
              createdAt: latestVersion.createdAt,
              document: latestVersion.document,
              requirementsCount: latestVersion._count.requirements,
            }
          : null,
        versions: policy.versions,
      };
    });
  }

  /**
   * Retrieves a single policy by ID with all versions and requirements.
   */
  async findOne(id: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id },
      include: {
        org: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            document: {
              include: {
                _count: { select: { pages: true } },
              },
            },
            requirements: {
              orderBy: [{ sourcePage: 'asc' }, { createdAt: 'asc' }],
              include: {
                _count: { select: { actions: true } },
              },
            },
          },
        },
        changes: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            versions: true,
            changes: true,
          },
        },
      },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID "${id}" was not found.`);
    }

    return policy;
  }

  /**
   * Retrieves all versions of a specific policy.
   */
  async getVersions(policyId: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });
    if (!policy) {
      throw new NotFoundException(`Policy with ID "${policyId}" was not found.`);
    }

    return this.prisma.policyVersion.findMany({
      where: { policyId },
      orderBy: { versionNumber: 'desc' },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            originalName: true,
            storageUrl: true,
            createdAt: true,
          },
        },
        requirements: {
          orderBy: [{ sourcePage: 'asc' }, { createdAt: 'asc' }],
        },
        _count: {
          select: {
            requirements: true,
            changesFrom: true,
            changesTo: true,
          },
        },
      },
    });
  }

  /**
   * Creates a new version for an existing policy, preserving all previous versions.
   */
  async createVersion(policyId: string, dto: CreateVersionDto) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID "${policyId}" was not found.`);
    }

    const document = await this.prisma.document.findUnique({
      where: { id: dto.documentId },
    });
    if (!document) {
      throw new NotFoundException(
        `Document with ID "${dto.documentId}" was not found.`,
      );
    }

    // Determine next sequential version number
    const maxVersionNumber =
      policy.versions.length > 0
        ? Math.max(...policy.versions.map((v) => v.versionNumber))
        : 0;
    const nextVersionNumber = maxVersionNumber + 1;

    const status = dto.status || PolicyVersionStatus.ACTIVE;

    if (status === PolicyVersionStatus.ACTIVE) {
      // Archive previously ACTIVE versions of this policy
      await this.prisma.policyVersion.updateMany({
        where: {
          policyId,
          status: PolicyVersionStatus.ACTIVE,
        },
        data: {
          status: PolicyVersionStatus.ARCHIVED,
        },
      });
    }

    const newVersion = await this.prisma.policyVersion.create({
      data: {
        policyId,
        versionNumber: nextVersionNumber,
        documentId: dto.documentId,
        status,
      },
      include: {
        document: true,
      },
    });

    // Extract and persist requirements for this new version
    if (dto.autoExtractRequirements !== false) {
      await this.extractAndSaveRequirements(newVersion.id, dto.documentId);
    }

    // Update policy updatedAt timestamp
    await this.prisma.policy.update({
      where: { id: policyId },
      data: { updatedAt: new Date() },
    });

    return this.prisma.policyVersion.findUnique({
      where: { id: newVersion.id },
      include: {
        document: true,
        requirements: true,
        _count: {
          select: { requirements: true },
        },
      },
    });
  }

  /**
   * Updates the status of a policy version (e.g. promoting DRAFT to ACTIVE).
   */
  async updateVersionStatus(
    policyId: string,
    versionId: string,
    status: PolicyVersionStatus,
  ) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });
    if (!policy) {
      throw new NotFoundException(`Policy with ID "${policyId}" was not found.`);
    }

    const version = await this.prisma.policyVersion.findFirst({
      where: { id: versionId, policyId },
    });

    if (!version) {
      throw new NotFoundException(
        `Policy version with ID "${versionId}" for policy "${policyId}" was not found.`,
      );
    }

    if (status === PolicyVersionStatus.ACTIVE) {
      // Archive other active versions for this policy
      await this.prisma.policyVersion.updateMany({
        where: {
          policyId,
          id: { not: versionId },
          status: PolicyVersionStatus.ACTIVE,
        },
        data: {
          status: PolicyVersionStatus.ARCHIVED,
        },
      });
    }

    const updated = await this.prisma.policyVersion.update({
      where: { id: versionId },
      data: { status },
      include: {
        document: true,
        requirements: true,
        _count: {
          select: { requirements: true },
        },
      },
    });

    await this.prisma.policy.update({
      where: { id: policyId },
      data: { updatedAt: new Date() },
    });

    return updated;
  }

  /**
   * Compares two policy versions:
   * 1. Fetches both versions and their requirements/documents.
   * 2. Runs AI / deterministic version comparison.
   * 3. Persists detected changes into PolicyChange table.
   * 4. Returns structured comparison summary and itemized changes with source references.
   */
  async compareVersions(dto: CompareVersionsDto) {
    const fromVersion = await this.prisma.policyVersion.findUnique({
      where: { id: dto.fromVersionId },
      include: {
        policy: true,
        document: {
          include: { pages: { orderBy: { pageNumber: 'asc' } } },
        },
        requirements: {
          orderBy: [{ sourcePage: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!fromVersion) {
      throw new NotFoundException(
        `Baseline version with ID "${dto.fromVersionId}" was not found.`,
      );
    }

    const toVersion = await this.prisma.policyVersion.findUnique({
      where: { id: dto.toVersionId },
      include: {
        policy: true,
        document: {
          include: { pages: { orderBy: { pageNumber: 'asc' } } },
        },
        requirements: {
          orderBy: [{ sourcePage: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!toVersion) {
      throw new NotFoundException(
        `Target version with ID "${dto.toVersionId}" was not found.`,
      );
    }

    if (fromVersion.id === toVersion.id) {
      throw new BadRequestException(
        'Cannot compare a policy version to itself. Please select two distinct versions.',
      );
    }

    const policyId = dto.policyId || fromVersion.policyId;
    const policyName = fromVersion.policy?.name || toVersion.policy?.name || 'Policy';

    // If requirements are empty for either version, attempt auto-extraction from document pages
    let fromReqs = fromVersion.requirements;
    if (fromReqs.length === 0 && fromVersion.documentId) {
      fromReqs = (await this.extractAndSaveRequirements(
        fromVersion.id,
        fromVersion.documentId,
      )) as any;
    }

    let toReqs = toVersion.requirements;
    if (toReqs.length === 0 && toVersion.documentId) {
      toReqs = (await this.extractAndSaveRequirements(
        toVersion.id,
        toVersion.documentId,
      )) as any;
    }

    this.logger.log(
      `Comparing Policy "${policyName}": v${fromVersion.versionNumber} (${fromReqs.length} reqs) vs v${toVersion.versionNumber} (${toReqs.length} reqs)`,
    );

    // Call AI Comparison Engine
    const detectedChanges = await this.aiService.comparePolicyVersions({
      policyName,
      fromVersionNumber: fromVersion.versionNumber,
      fromRequirements: fromReqs,
      toVersionNumber: toVersion.versionNumber,
      toRequirements: toReqs,
      fromPages: fromVersion.document?.pages || [],
      toPages: toVersion.document?.pages || [],
    });

    // Persist changes to database (delete existing comparison between these two versions to avoid duplicate clutter)
    await this.prisma.policyChange.deleteMany({
      where: {
        fromVersionId: fromVersion.id,
        toVersionId: toVersion.id,
      },
    });

    const persistedChanges = await Promise.all(
      detectedChanges.map((change) => {
        let changeTypeEnum: ChangeType = ChangeType.MODIFIED;
        if (change.changeType === ComparisonChangeType.ADDED) changeTypeEnum = ChangeType.ADDED;
        else if (change.changeType === ComparisonChangeType.REMOVED) changeTypeEnum = ChangeType.REMOVED;
        else if (change.changeType === ComparisonChangeType.REORDERED) changeTypeEnum = ChangeType.REORDERED;

        let impactSeverity: ImpactSeverity = ImpactSeverity.MEDIUM;
        if (change.severity === 'CRITICAL') impactSeverity = ImpactSeverity.CRITICAL;
        else if (change.severity === 'HIGH') impactSeverity = ImpactSeverity.HIGH;
        else if (change.severity === 'LOW') impactSeverity = ImpactSeverity.LOW;

        const impactDesc = `Operational and compliance impact for ${changeTypeEnum.toLowerCase()} ${change.fieldChanged || 'requirement'}: ${change.description}`;

        return this.prisma.policyChange.create({
          data: {
            policyId,
            fromVersionId: fromVersion.id,
            toVersionId: toVersion.id,
            changeType: changeTypeEnum,
            fieldChanged: change.fieldChanged || 'REQUIREMENT',
            description: change.description,
            affectedSection: change.affectedSection || null,
            oldValue: change.oldValue || null,
            newValue: change.newValue || null,
            sourceReference: change.sourceReference || null,
            confidence: change.confidence || 0.9,
            impacts: {
              create: [
                {
                  description: impactDesc,
                  severity: impactSeverity,
                  status: ImpactStatus.IDENTIFIED,
                },
              ],
            },
          },
          include: {
            impacts: true,
          },
        });
      }),
    );

    // Compile summary metrics
    const addedCount = persistedChanges.filter((c) => c.changeType === ChangeType.ADDED).length;
    const removedCount = persistedChanges.filter((c) => c.changeType === ChangeType.REMOVED).length;
    const modifiedCount = persistedChanges.filter((c) => c.changeType === ChangeType.MODIFIED).length;
    const deadlineChangesCount = persistedChanges.filter(
      (c) => c.fieldChanged === 'DEADLINE',
    ).length;
    const evidenceChangesCount = persistedChanges.filter(
      (c) => c.fieldChanged === 'EVIDENCE',
    ).length;

    return {
      policyId,
      policyName,
      fromVersion: {
        id: fromVersion.id,
        versionNumber: fromVersion.versionNumber,
        status: fromVersion.status,
        documentTitle: fromVersion.document?.title,
        documentUrl: fromVersion.document?.storageUrl,
        requirementsCount: fromReqs.length,
        createdAt: fromVersion.createdAt,
      },
      toVersion: {
        id: toVersion.id,
        versionNumber: toVersion.versionNumber,
        status: toVersion.status,
        documentTitle: toVersion.document?.title,
        documentUrl: toVersion.document?.storageUrl,
        requirementsCount: toReqs.length,
        createdAt: toVersion.createdAt,
      },
      summary: {
        totalChanges: persistedChanges.length,
        addedCount,
        removedCount,
        modifiedCount,
        deadlineChangesCount,
        evidenceChangesCount,
      },
      changes: persistedChanges,
    };
  }

  /**
   * Retrieves detected changes for a policy, optionally filtered by versions.
   */
  async getChanges(policyId: string, fromVersionId?: string, toVersionId?: string) {
    const where: any = { policyId };
    if (fromVersionId) where.fromVersionId = fromVersionId;
    if (toVersionId) where.toVersionId = toVersionId;

    return this.prisma.policyChange.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        fromVersion: {
          select: { id: true, versionNumber: true },
        },
        toVersion: {
          select: { id: true, versionNumber: true },
        },
        impacts: true,
      },
    });
  }

  /**
   * Retrieves a single change by ID.
   */
  async getChangeById(id: string) {
    const change = await this.prisma.policyChange.findUnique({
      where: { id },
      include: {
        policy: true,
        fromVersion: {
          include: { document: true },
        },
        toVersion: {
          include: { document: true },
        },
        impacts: true,
      },
    });

    if (!change) {
      throw new NotFoundException(`Policy change with ID "${id}" was not found.`);
    }

    return change;
  }
}
