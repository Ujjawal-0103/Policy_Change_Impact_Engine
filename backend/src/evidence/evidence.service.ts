import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// TODO: Implement evidence upload via Cloudinary
@Injectable()
export class EvidenceService {
  constructor(private readonly prisma: PrismaService) {}
}
