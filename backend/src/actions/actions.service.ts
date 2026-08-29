import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { CreateActionDto } from './dto/create-action.dto.js';
import { UpdateActionStatusDto } from './dto/update-action-status.dto.js';
import { AssignActionDto } from './dto/assign-action.dto.js';
import { CreateEvidenceDto } from './dto/create-evidence.dto.js';
import { FilterActionDto } from './dto/filter-action.dto.js';
import { ActionStatus, Priority, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

@Injectable()
export class ActionsService {
  private readonly logger = new Logger(ActionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Evaluates if an action is overdue based on deadline and status.
   * If action is not COMPLETED and deadline < now, it is OVERDUE.
   */
  private computeEffectiveStatus(
    status: ActionStatus,
    deadline: Date | null,
  ): ActionStatus {
    if (status === ActionStatus.COMPLETED) {
      return ActionStatus.COMPLETED;
    }
    if (deadline && new Date(deadline).getTime() < Date.now()) {
      return ActionStatus.OVERDUE;
    }
    return status;
  }

  /**
   * List all actions with optional filters scoped strictly to organization.
   */
  async findAll(filter: FilterActionDto | undefined, orgId: string) {
    const where: Prisma.ActionWhereInput = {
      requirement: {
        policyVersion: {
          policy: {
            orgId: orgId,
          },
        },
      },
    };

    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.priority) {
      where.priority = filter.priority;
    }
    if (filter?.department) {
      where.department = { contains: filter.department, mode: 'insensitive' };
    }
    if (filter?.requirementId) {
      where.requirementId = filter.requirementId;
    }
    if (filter?.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
        { department: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const actions = await this.prisma.action.findMany({
      where,
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
      include: {
        requirement: {
          select: {
            id: true,
            title: true,
            priority: true,
            deadline: true,
            policyVersionId: true,
            policyVersion: {
              select: {
                policy: {
                  select: { id: true, name: true, orgId: true },
                },
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        evidence: {
          select: {
            id: true,
            title: true,
            fileUrl: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            evidence: true,
            history: true,
          },
        },
      },
    });

    return actions.map((act) => ({
      ...act,
      computedStatus: this.computeEffectiveStatus(act.status, act.deadline),
      isOverdue:
        act.status !== ActionStatus.COMPLETED &&
        Boolean(act.deadline && new Date(act.deadline).getTime() < Date.now()),
    }));
  }

  /**
   * Get action KPIs and statistics strictly for the specified organization.
   */
  async getStats(orgId: string) {
    const where: Prisma.ActionWhereInput = {
      requirement: {
        policyVersion: {
          policy: {
            orgId: orgId,
          },
        },
      },
    };

    const actions = await this.prisma.action.findMany({
      where,
      select: {
        id: true,
        status: true,
        priority: true,
        deadline: true,
      },
    });

    const now = Date.now();
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let blocked = 0;
    let overdue = 0;

    const byPriority: Record<Priority, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    for (const act of actions) {
      if (act.priority && byPriority[act.priority] !== undefined) {
        byPriority[act.priority]++;
      }

      if (act.status === ActionStatus.COMPLETED) {
        completed++;
      } else {
        if (act.deadline && new Date(act.deadline).getTime() < now) {
          overdue++;
        }
        if (act.status === ActionStatus.IN_PROGRESS) {
          inProgress++;
        } else if (act.status === ActionStatus.BLOCKED) {
          blocked++;
        } else if (act.status === ActionStatus.PENDING || act.status === ActionStatus.OVERDUE) {
          pending++;
        }
      }
    }

    const totalActions = actions.length;
    const completionRate =
      totalActions > 0 ? Number(((completed / totalActions) * 100).toFixed(1)) : 0;

    return {
      totalActions,
      pending,
      inProgress,
      completed,
      blocked,
      overdue,
      completionRate,
      byPriority,
    };
  }

  /**
   * Retrieve a single action by ID scoped strictly to organization.
   */
  async findOne(id: string, orgId: string) {
    const action = await this.prisma.action.findUnique({
      where: { id },
      include: {
        requirement: {
          include: {
            policyVersion: {
              select: {
                id: true,
                versionNumber: true,
                status: true,
                policy: { select: { id: true, name: true, orgId: true } },
                document: { select: { id: true, title: true, storageUrl: true } },
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        evidence: {
          orderBy: { createdAt: 'desc' },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        dependencies: {
          include: {
            dependsOn: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
        dependents: {
          include: {
            action: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!action || action.requirement?.policyVersion?.policy?.orgId !== orgId) {
      throw new NotFoundException(`Action with ID "${id}" was not found.`);
    }

    const isOverdue =
      action.status !== ActionStatus.COMPLETED &&
      Boolean(action.deadline && new Date(action.deadline).getTime() < Date.now());

    return {
      ...action,
      computedStatus: this.computeEffectiveStatus(action.status, action.deadline),
      isOverdue,
    };
  }

  /**
   * Create an organizational Action linked to an existing Requirement in caller's organization.
   */
  async create(dto: CreateActionDto, user: AuthenticatedUser) {
    // 1. Verify Requirement exists and belongs to the user's organization
    const requirement = await this.prisma.requirement.findUnique({
      where: { id: dto.requirementId },
      include: {
        policyVersion: {
          include: { policy: true },
        },
      },
    });

    if (!requirement || requirement.policyVersion?.policy?.orgId !== user.orgId) {
      throw new NotFoundException(
        `Referenced requirement "${dto.requirementId}" does not exist in your organization.`,
      );
    }

    // 2. Validate assignedToId if provided
    let assignedUserId: string | null = null;
    if (dto.assignedToId) {
      const assignedUser = await this.prisma.user.findUnique({
        where: { id: dto.assignedToId },
      });
      if (!assignedUser || assignedUser.orgId !== user.orgId) {
        throw new BadRequestException(
          `Assigned user with ID "${dto.assignedToId}" not found in your organization.`,
        );
      }
      assignedUserId = assignedUser.id;
    }

    // 3. Resolve priority and deadline
    const priority = dto.priority || requirement.priority || Priority.MEDIUM;
    const deadline = dto.deadline ? new Date(dto.deadline) : requirement.deadline || null;
    const initialStatus = dto.status || ActionStatus.PENDING;

    // 4. Resolve audit user ID strictly from authenticated session
    const auditUserId = user.userId;

    // 5. Create action and initial audit history entry
    const action = await this.prisma.action.create({
      data: {
        requirementId: requirement.id,
        title: dto.title.trim(),
        description: (dto.description || dto.title).trim(),
        status: initialStatus,
        priority: priority,
        department: dto.department?.trim() || null,
        assignedToId: assignedUserId,
        deadline: deadline,
        history: {
          create: {
            field: 'status',
            oldValue: null,
            newValue: initialStatus,
            note: dto.note?.trim() || 'Action created',
            userId: auditUserId,
          },
        },
      },
      include: {
        requirement: {
          select: {
            id: true,
            title: true,
            priority: true,
            deadline: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        evidence: true,
        history: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    this.logger.log(
      `Created Action "${action.title}" (${action.id}) linked to Requirement ${requirement.id}`,
    );

    return {
      ...action,
      computedStatus: this.computeEffectiveStatus(action.status, action.deadline),
      isOverdue:
        action.status !== ActionStatus.COMPLETED &&
        Boolean(action.deadline && new Date(action.deadline).getTime() < Date.now()),
    };
  }

  /**
   * Update Action status with audit history tracking.
   */
  async updateStatus(id: string, dto: UpdateActionStatusDto, user: AuthenticatedUser) {
    const existing = await this.prisma.action.findUnique({
      where: { id },
      include: {
        requirement: {
          include: { policyVersion: { include: { policy: true } } },
        },
      },
    });

    if (!existing || existing.requirement?.policyVersion?.policy?.orgId !== user.orgId) {
      throw new NotFoundException(`Action with ID "${id}" was not found.`);
    }

    // If status hasn't changed, return without creating duplicate history entries
    if (existing.status === dto.status) {
      return this.findOne(id, user.orgId);
    }

    const auditUserId = user.userId;

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Record history entry
      await tx.actionHistory.create({
        data: {
          actionId: id,
          field: 'status',
          oldValue: existing.status,
          newValue: dto.status,
          note: dto.note?.trim() || `Status updated from ${existing.status} to ${dto.status}`,
          userId: auditUserId,
        },
      });

      // 2. Update action
      return tx.action.update({
        where: { id },
        data: {
          status: dto.status,
        },
        include: {
          requirement: {
            select: { id: true, title: true, priority: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          evidence: true,
          history: {
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });
    });

    this.logger.log(
      `Action ${id} status updated from ${existing.status} -> ${dto.status}`,
    );

    return updated;
  }

  /**
   * Assign Action to an owner user and/or department with audit history tracking.
   */
  async assign(id: string, dto: AssignActionDto, user: AuthenticatedUser) {
    const existing = await this.prisma.action.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        requirement: {
          include: { policyVersion: { include: { policy: true } } },
        },
      },
    });

    if (!existing || existing.requirement?.policyVersion?.policy?.orgId !== user.orgId) {
      throw new NotFoundException(`Action with ID "${id}" was not found.`);
    }

    let newAssignedUser = existing.assignedTo;
    if (dto.assignedToId !== undefined) {
      if (dto.assignedToId) {
        const assignedUser = await this.prisma.user.findUnique({
          where: { id: dto.assignedToId },
        });
        if (!assignedUser || assignedUser.orgId !== user.orgId) {
          throw new BadRequestException(
            `Assigned user with ID "${dto.assignedToId}" not found in your organization.`,
          );
        }
        newAssignedUser = assignedUser;
      } else {
        newAssignedUser = null;
      }
    }

    const newDepartment =
      dto.department !== undefined ? dto.department?.trim() || null : existing.department;

    const auditUserId = user.userId;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Record assigned user history if changed
      if (existing.assignedToId !== (newAssignedUser?.id || null)) {
        await tx.actionHistory.create({
          data: {
            actionId: id,
            field: 'assignedTo',
            oldValue: existing.assignedTo?.name || existing.assignedToId || 'Unassigned',
            newValue: newAssignedUser?.name || 'Unassigned',
            note: dto.note?.trim() || `Assigned user updated to ${newAssignedUser?.name || 'Unassigned'}`,
            userId: auditUserId,
          },
        });
      }

      // Record department history if changed
      if (existing.department !== newDepartment) {
        await tx.actionHistory.create({
          data: {
            actionId: id,
            field: 'department',
            oldValue: existing.department || 'None',
            newValue: newDepartment || 'None',
            note: dto.note?.trim() || `Department updated to ${newDepartment || 'None'}`,
            userId: auditUserId,
          },
        });
      }

      return tx.action.update({
        where: { id },
        data: {
          assignedToId: newAssignedUser?.id || null,
          department: newDepartment,
        },
        include: {
          requirement: {
            select: { id: true, title: true, priority: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          evidence: true,
          history: {
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });
    });

    this.logger.log(`Action ${id} assignment updated.`);
    return updated;
  }

  /**
   * Attach evidence to an Action with file upload support & audit tracking.
   */
  async addEvidence(
    id: string,
    dto: CreateEvidenceDto,
    user: AuthenticatedUser,
    file?: Express.Multer.File,
  ) {
    const existing = await this.prisma.action.findUnique({
      where: { id },
      include: {
        requirement: {
          include: { policyVersion: { include: { policy: true } } },
        },
      },
    });

    if (!existing || existing.requirement?.policyVersion?.policy?.orgId !== user.orgId) {
      throw new NotFoundException(`Action with ID "${id}" was not found.`);
    }

    let fileUrl = dto.fileUrl || null;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadEvidenceFile(file);
      fileUrl = uploadResult.url;
    }

    const auditUserId = user.userId;

    const result = await this.prisma.$transaction(async (tx) => {
      const evidence = await tx.evidence.create({
        data: {
          actionId: id,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          fileUrl,
        },
      });

      await tx.actionHistory.create({
        data: {
          actionId: id,
          field: 'evidence',
          oldValue: null,
          newValue: evidence.title,
          note: `Evidence attached: ${evidence.title}`,
          userId: auditUserId,
        },
      });

      return evidence;
    });

    this.logger.log(`Evidence "${result.title}" added to Action ${id}`);
    return result;
  }
}
