import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// TODO: Implement requirements CRUD
@Injectable()
export class RequirementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.requirement.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    return this.prisma.requirement.findUnique({ where: { id } });
  }
}
