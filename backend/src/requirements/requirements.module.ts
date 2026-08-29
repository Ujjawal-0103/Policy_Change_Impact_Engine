import { Module } from '@nestjs/common';
import { RequirementsController } from './requirements.controller.js';
import { RequirementsService } from './requirements.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [RequirementsController],
  providers: [RequirementsService],
  exports: [RequirementsService],
})
export class RequirementsModule {}
