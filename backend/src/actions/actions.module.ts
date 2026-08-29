import { Module } from '@nestjs/common';
import { ActionsController } from './actions.controller.js';
import { ActionsService } from './actions.service.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [CloudinaryModule, AuthModule],
  controllers: [ActionsController],
  providers: [ActionsService],
  exports: [ActionsService],
})
export class ActionsModule {}
