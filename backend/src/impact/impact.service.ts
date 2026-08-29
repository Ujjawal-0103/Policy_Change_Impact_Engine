import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ImpactSeverity, ImpactStatus } from '@prisma/client';

@Injectable()
export class ImpactService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves impacts for a specific policy change ID, scoped strictly to organization.
   */
  async getImpacts(changeId: string, orgId: string) {
    const change = await this.prisma.policyChange.findFirst({
      where: { id: changeId, policy: { orgId } },
      include: {
        policy: true,
        impacts: true,
      },
    });

    if (!change) {
      throw new NotFoundException(`Policy change with ID "${changeId}" was not found.`);
    }

    if (change.impacts.length === 0) {
      let impactSeverity: ImpactSeverity = ImpactSeverity.MEDIUM;
      const createdImpact = await this.prisma.impact.create({
        data: {
          policyChangeId: change.id,
          description: `Operational compliance impact for ${change.changeType.toLowerCase()} ${change.fieldChanged || 'requirement'}: ${change.description}`,
          severity: impactSeverity,
          status: ImpactStatus.IDENTIFIED,
        },
      });
      return [createdImpact];
    }

    return change.impacts;
  }

  /**
   * Lists all impacts strictly for the authenticated organization.
   */
  async findAll(
    filter: { policyId?: string; severity?: ImpactSeverity; status?: ImpactStatus } | undefined,
    orgId: string,
  ) {
    const where: any = {
      policyChange: {
        policy: { orgId },
      },
    };

    if (filter?.policyId) {
      where.policyChange = {
        ...where.policyChange,
        policyId: filter.policyId,
      };
    }
    if (filter?.severity) {
      where.severity = filter.severity;
    }
    if (filter?.status) {
      where.status = filter.status;
    }

    return this.prisma.impact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        policyChange: {
          include: {
            policy: { select: { id: true, name: true, orgId: true } },
            fromVersion: { select: { id: true, versionNumber: true } },
            toVersion: { select: { id: true, versionNumber: true } },
          },
        },
      },
    });
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
            policy: true,
            fromVersion: true,
            toVersion: true,
          },
        },
      },
    });
  }
}