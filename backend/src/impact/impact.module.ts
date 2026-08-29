import { Module } from '@nestjs/common';
import { ImpactController } from './impact.controller.js';
import { ImpactService } from './impact.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ImpactController],
  providers: [ImpactService],
  exports: [ImpactService],
})
export class ImpactModule {}
