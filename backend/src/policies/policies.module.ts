import { Module } from '@nestjs/common';
import { PoliciesController } from './policies.controller.js';
import { PoliciesService } from './policies.service.js';
import { AiModule } from '../ai/ai.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AiModule, AuthModule],
  controllers: [PoliciesController],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
