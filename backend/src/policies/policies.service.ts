import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// TODO: Implement policy CRUD, version management, and comparison
@Injectable()
export class PoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.policy.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getVersions(policyId: string) {
    return this.prisma.policyVersion.findMany({
      where: { policyId },
      orderBy: { versionNumber: 'desc' },
    });
  }
}
