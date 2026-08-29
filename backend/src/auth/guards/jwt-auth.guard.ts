import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header.');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedException('Authentication token is required.');
    }

    try {
      const isProd =
        this.configService.get<string>('NODE_ENV') === 'production' ||
        process.env.NODE_ENV === 'production';

      const secret =
        this.configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;

      if (!secret && isProd) {
        throw new Error('JWT_SECRET environment variable is missing in production.');
      }

      const activeSecret = secret || 'dev-local-jwt-secret-not-for-production-use';

      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        orgId: string;
        email: string;
        name: string;
      }>(token, { secret: activeSecret });

      const authenticatedUser: AuthenticatedUser = {
        userId: payload.sub,
        orgId: payload.orgId,
        email: payload.email,
        name: payload.name,
      };

      request.user = authenticatedUser;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }
}
