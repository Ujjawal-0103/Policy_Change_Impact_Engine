import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// TODO: Implement AI extraction using Gemini API
// ARCHITECTURE NOTE: Gemini must NEVER have direct DB access.
// This service will call Gemini, validate the result, then return
// structured data to the calling service which will persist it via Prisma.
@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}
}
