import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaMock: any;
  let jwtServiceMock: any;
  let configServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      organization: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    jwtServiceMock = {
      sign: vi.fn().mockReturnValue('mock_jwt_token_123'),
      verifyAsync: vi.fn(),
    };

    configServiceMock = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'JWT_EXPIRES_IN') return '7d';
        if (key === 'NODE_ENV') return 'development';
        return null;
      }),
    };

    authService = new AuthService(
      prismaMock as unknown as PrismaService,
      jwtServiceMock as unknown as JwtService,
      configServiceMock as unknown as ConfigService,
    );
  });

  describe('register', () => {
    it('throws ConflictException if email is already taken', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existing_user' });

      await expect(
        authService.register({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates organization and user, and returns signed JWT token', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.organization.findUnique.mockResolvedValue(null);
      prismaMock.organization.create.mockResolvedValue({
        id: 'org_123',
        name: 'Jane Org',
        slug: 'jane-org',
      });
      prismaMock.user.create.mockResolvedValue({
        id: 'user_123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        orgId: 'org_123',
        createdAt: new Date(),
        org: { id: 'org_123', name: 'Jane Org', slug: 'jane-org' },
      });

      const result = await authService.register({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'securePassword123',
        organizationName: 'Jane Org',
      });

      expect(result.accessToken).toBe('mock_jwt_token_123');
      expect(result.user.id).toBe('user_123');
      expect(result.user.orgId).toBe('org_123');
      expect(prismaMock.organization.create).toHaveBeenCalled();
      expect(prismaMock.user.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'unknown@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
        password: hashedPassword,
        name: 'User',
        orgId: 'org_1',
        org: { id: 'org_1', name: 'Org', slug: 'org' },
      });

      await expect(
        authService.login({
          email: 'user@example.com',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('successfully logs in with valid credentials', async () => {
      const password = 'validPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
        password: hashedPassword,
        name: 'User One',
        orgId: 'org_1',
        createdAt: new Date(),
        org: { id: 'org_1', name: 'Acme', slug: 'acme' },
      });

      const result = await authService.login({
        email: 'user@example.com',
        password: password,
      });

      expect(result.accessToken).toBe('mock_jwt_token_123');
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.orgId).toBe('org_1');
    });

    it('disables demo admin auto-provisioning in production', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'JWT_SECRET') return 'prod-secret';
        return null;
      });

      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'admin@policyengine.local',
          password: 'admin123',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('throws Error in production if JWT_SECRET is missing', async () => {
      const originalJwtSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      try {
        configServiceMock.get.mockImplementation((key: string) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'JWT_SECRET') return null;
          return null;
        });

        const password = 'validPassword123';
        const hashedPassword = await bcrypt.hash(password, 10);

        prismaMock.user.findUnique.mockResolvedValue({
          id: 'user_1',
          email: 'user@example.com',
          password: hashedPassword,
          name: 'User One',
          orgId: 'org_1',
          createdAt: new Date(),
          org: { id: 'org_1', name: 'Acme', slug: 'acme' },
        });

        await expect(
          authService.login({
            email: 'user@example.com',
            password: password,
          }),
        ).rejects.toThrow(/JWT_SECRET environment variable is required in production/);
      } finally {
        if (originalJwtSecret !== undefined) {
          process.env.JWT_SECRET = originalJwtSecret;
        }
      }
    });
  });
});
