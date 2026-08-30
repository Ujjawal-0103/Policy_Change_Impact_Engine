import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { EmailModule } from '../email/email.module.js';

const logger = new Logger('AuthModule');

@Module({
  imports: [
    ConfigModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProd =
          configService.get<string>('NODE_ENV') === 'production' ||
          process.env.NODE_ENV === 'production';

        const secret =
          configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;

        if (!secret) {
          if (isProd) {
            throw new Error(
              'FATAL: JWT_SECRET environment variable must be explicitly defined in production.',
            );
          }
          logger.warn(
            'JWT_SECRET is not configured in development environment. Using local dev secret for demonstration.',
          );
        }

        return {
          secret: secret || 'dev-local-jwt-secret-not-for-production-use',
          signOptions: {
            expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '7d') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
