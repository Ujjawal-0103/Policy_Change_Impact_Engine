import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// TODO: Implement actions CRUD, status updates, assignment, evidence upload
@Injectable()
export class ActionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.action.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    return this.prisma.action.findUnique({ where: { id } });
  }
}
