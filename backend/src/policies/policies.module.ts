import { Module } from '@nestjs/common';
import { PoliciesController } from './policies.controller.js';
import { PoliciesService } from './policies.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [PoliciesController],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
