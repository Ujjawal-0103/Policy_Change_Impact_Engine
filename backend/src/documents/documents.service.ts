import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// TODO: Implement document CRUD and Cloudinary upload integration
@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.document.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    return this.prisma.document.findUnique({ where: { id } });
  }
}
