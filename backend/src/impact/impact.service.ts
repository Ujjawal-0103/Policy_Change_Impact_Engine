import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// TODO: Implement impact mapping engine
@Injectable()
export class ImpactService {
  constructor(private readonly prisma: PrismaService) {}

  async getImpacts(changeId: string) {
    return this.prisma.impact.findMany({
      where: { policyChangeId: changeId },
    });
  }
}
