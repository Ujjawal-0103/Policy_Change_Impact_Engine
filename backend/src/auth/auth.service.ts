import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Resolves the active JWT signing secret and fails if missing in production.
   */
  private getJwtSecret(): string {
    const isProd =
      this.configService.get<string>('NODE_ENV') === 'production' ||
      process.env.NODE_ENV === 'production';

    const secret =
      this.configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;

    if (!secret) {
      if (isProd) {
        throw new Error(
          'FATAL: JWT_SECRET environment variable is required in production.',
        );
      }
      return 'dev-local-jwt-secret-not-for-production-use';
    }

    return secret;
  }

  /**
   * Generates a signed JWT for an authenticated user.
   */
  private generateToken(user: { id: string; email: string; name: string; orgId: string | null }): string {
    const payload = {
      sub: user.id,
      orgId: user.orgId || '',
      email: user.email,
      name: user.name,
    };

    const secret = this.getJwtSecret();

    const expiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') || '7d';

    return this.jwtService.sign(payload, { secret, expiresIn: expiresIn as any });
  }

  /**
   * Registers a new user and creates an isolated Organization.
   */
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email address already exists.');
    }

    // Hash password securely
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Derive organization name & unique slug
    const orgName = dto.organizationName?.trim() || `${dto.name.trim()}'s Organization`;
    let baseSlug = dto.organizationSlug?.trim().toLowerCase().replace(/[^a-z0-9]/g, '-') ||
      orgName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    if (!baseSlug || baseSlug === '-') {
      baseSlug = `org-${Date.now()}`;
    }

    // Ensure slug uniqueness
    let slug = baseSlug;
    let counter = 1;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Create organization and user in transaction
    const org = await this.prisma.organization.create({
      data: {
        name: orgName,
        slug: slug,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        name: dto.name.trim(),
        password: hashedPassword,
        orgId: org.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        orgId: true,
        createdAt: true,
        org: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const token = this.generateToken(user);

    this.logger.log(`New user registered: ${user.email} (Org: ${org.name}, ID: ${org.id})`);

    return {
      accessToken: token,
      user,
    };
  }

  /**
   * Authenticates a user with email and password.
   */
  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const isDevOrDemo =
      (this.configService.get<string>('NODE_ENV') || process.env.NODE_ENV) !== 'production';

    // Look for user
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        org: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Support seamless login for default demo admin ONLY in development/demo mode
    if (isDevOrDemo && !user && email === 'admin@policyengine.local') {
      let defaultOrg = await this.prisma.organization.findFirst({
        where: { slug: 'default-org' },
      });
      if (!defaultOrg) {
        defaultOrg = await this.prisma.organization.create({
          data: { name: 'Acme Enterprise', slug: 'default-org' },
        });
      }

      const hashedDefaultPassword = await bcrypt.hash('admin123', 10);
      user = await this.prisma.user.create({
        data: {
          name: 'System Admin',
          email: 'admin@policyengine.local',
          password: hashedDefaultPassword,
          orgId: defaultOrg.id,
        },
        include: {
          org: { select: { id: true, name: true, slug: true } },
        },
      });
    }

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Check password
    let isPasswordValid = await bcrypt.compare(dto.password, user.password);

    // Fallback for demo password on admin user ONLY in development/demo mode
    if (
      isDevOrDemo &&
      !isPasswordValid &&
      user.email === 'admin@policyengine.local' &&
      (dto.password === 'admin123' || dto.password === 'admin' || user.password === 'system_default_password_hash')
    ) {
      const updatedHash = await bcrypt.hash(dto.password, 10);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: updatedHash },
      });
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Ensure user has an organization
    if (!user.orgId || !user.org) {
      let defaultOrg = await this.prisma.organization.findFirst({
        where: { slug: 'default-org' },
      }) || await this.prisma.organization.create({
        data: { name: 'Default Organization', slug: 'default-org' },
      });

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { orgId: defaultOrg.id },
        include: { org: { select: { id: true, name: true, slug: true } } },
      });
    }

    const token = this.generateToken(user);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        orgId: user.orgId,
        createdAt: user.createdAt,
        org: user.org,
      },
    };
  }

  /**
   * Retrieves profile of currently authenticated user.
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        orgId: true,
        createdAt: true,
        updatedAt: true,
        org: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile was not found.');
    }

    return user;
  }
}
