import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class RequirementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter?: { policyVersionId?: string; policyId?: string }) {
    const where: any = {};
    if (filter?.policyVersionId) {
      where.policyVersionId = filter.policyVersionId;
    }
    if (filter?.policyId) {
      where.policyVersion = { policyId: filter.policyId };
    }

    return this.prisma.requirement.findMany({
      where,
      orderBy: [{ sourcePage: 'asc' }, { createdAt: 'asc' }],
      include: {
        policyVersion: {
          select: {
            id: true,
            versionNumber: true,
            status: true,
            policy: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { actions: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id },
      include: {
        policyVersion: {
          include: {
            policy: true,
            document: true,
          },
        },
        actions: true,
      },
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement with ID "${id}" was not found.`);
    }

    return requirement;
  }
}
