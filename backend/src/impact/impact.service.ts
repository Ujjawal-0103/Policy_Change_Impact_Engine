import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ImpactSeverity, ImpactStatus } from '@prisma/client';

@Injectable()
export class ImpactService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves impacts for a specific policy change ID.
   * Throws 404 NotFoundException if the change does not exist.
   * Deterministically creates a default impact if change exists without one.
   */
  async getImpacts(changeId: string) {
    const change = await this.prisma.policyChange.findUnique({
      where: { id: changeId },
      include: {
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
   * Lists all impacts across policies, optionally filtered by policy, severity, or status.
   */
  async findAll(filter?: { policyId?: string; severity?: ImpactSeverity; status?: ImpactStatus }) {
    const where: any = {};
    if (filter?.policyId) {
      where.policyChange = { policyId: filter.policyId };
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
            policy: { select: { id: true, name: true } },
            fromVersion: { select: { id: true, versionNumber: true } },
            toVersion: { select: { id: true, versionNumber: true } },
          },
        },
      },
    });
  }

  /**
   * Retrieves a single impact record by ID with full policyChange relation.
   */
  async getImpactById(id: string) {
    const impact = await this.prisma.impact.findUnique({
      where: { id },
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
   * Updates status of an existing impact.
   */
  async updateImpactStatus(id: string, status: ImpactStatus) {
    const existing = await this.prisma.impact.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Impact record with ID "${id}" was not found.`);
    }

    return this.prisma.impact.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
  }
}

