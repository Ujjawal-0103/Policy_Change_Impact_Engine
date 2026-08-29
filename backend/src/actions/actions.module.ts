import { Module } from '@nestjs/common';
import { ActionsController } from './actions.controller.js';
import { ActionsService } from './actions.service.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';

@Module({
  imports: [CloudinaryModule],
  controllers: [ActionsController],
  providers: [ActionsService],
  exports: [ActionsService],
})
export class ActionsModule {}
