import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { PoliciesModule } from './policies/policies.module.js';
import { RequirementsModule } from './requirements/requirements.module.js';
import { ActionsModule } from './actions/actions.module.js';
import { AiModule } from './ai/ai.module.js';
import { ImpactModule } from './impact/impact.module.js';
import { EvidenceModule } from './evidence/evidence.module.js';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    DocumentsModule,
    PoliciesModule,
    RequirementsModule,
    ActionsModule,
    AiModule,
    ImpactModule,
    EvidenceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
