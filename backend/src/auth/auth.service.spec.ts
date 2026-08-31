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
  let emailServiceMock: any;

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

    emailServiceMock = {
      sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
    };

    configServiceMock = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'JWT_EXPIRES_IN') return '7d';
        if (key === 'NODE_ENV') return 'development';
        if (key === 'APP_URL') return 'http://localhost:3000';
        return null;
      }),
    };

    authService = new AuthService(
      prismaMock as unknown as PrismaService,
      jwtServiceMock as unknown as JwtService,
      configServiceMock as unknown as ConfigService,
      emailServiceMock as any,
    );
  });

  describe('register', () => {
    it('throws ConflictException if email is already taken', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existing_user' });

      await expect(
        authService.register({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'SecurePassword123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects password shorter than 8 characters', async () => {
      await expect(
        authService.register({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'Short1!',
        }),
      ).rejects.toThrow(/Password must be at least 8 characters long/);
    });

    it('rejects password missing uppercase letter', async () => {
      await expect(
        authService.register({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'lowercase123!',
        }),
      ).rejects.toThrow(/Password must be at least 8 characters long/);
    });

    it('rejects password missing lowercase letter', async () => {
      await expect(
        authService.register({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'UPPERCASE123!',
        }),
      ).rejects.toThrow(/Password must be at least 8 characters long/);
    });

    it('rejects password missing number', async () => {
      await expect(
        authService.register({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'PasswordWithoutNum!',
        }),
      ).rejects.toThrow(/Password must be at least 8 characters long/);
    });

    it('rejects password missing special character', async () => {
      await expect(
        authService.register({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'Password123NoSpecial',
        }),
      ).rejects.toThrow(/Password must be at least 8 characters long/);
    });

    it('creates organization and user, and returns confirmation message without accessToken', async () => {
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
        password: 'SecurePassword123!',
        organizationName: 'Jane Org',
      });

      // Crucial: registration does NOT issue an access token
      expect((result as any).accessToken).toBeUndefined();
      expect(result.message).toBe('Account created successfully. Please sign in.');
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

    it('successfully logs in with valid credentials and issues JWT token', async () => {
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

    it('allows valid login for existing accounts with simple/weak passwords', async () => {
      const legacySimplePassword = 'admin';
      const hashedPassword = await bcrypt.hash(legacySimplePassword, 10);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user_legacy',
        email: 'legacy@example.com',
        password: hashedPassword,
        name: 'Legacy User',
        orgId: 'org_1',
        createdAt: new Date(),
        org: { id: 'org_1', name: 'Acme', slug: 'acme' },
      });

      const result = await authService.login({
        email: 'legacy@example.com',
        password: legacySimplePassword,
      });

      expect(result.accessToken).toBe('mock_jwt_token_123');
      expect(result.user.email).toBe('legacy@example.com');
    });

    it('auto-provisions demo admin if not yet present in database', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.organization.findFirst.mockResolvedValue(null);
      prismaMock.organization.create.mockResolvedValue({
        id: 'default_org_id',
        name: 'Acme Enterprise',
        slug: 'default-org',
      });
      prismaMock.user.create.mockResolvedValue({
        id: 'admin_id',
        name: 'System Admin',
        email: 'admin@policyengine.local',
        password: await bcrypt.hash('admin123', 10),
        orgId: 'default_org_id',
        createdAt: new Date(),
        org: { id: 'default_org_id', name: 'Acme Enterprise', slug: 'default-org' },
      });

      const result = await authService.login({
        email: 'admin@policyengine.local',
        password: 'admin123',
      });

      expect(result.accessToken).toBe('mock_jwt_token_123');
      expect(result.user.email).toBe('admin@policyengine.local');
      expect(prismaMock.user.create).toHaveBeenCalled();
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

  describe('forgotPassword', () => {
    it('returns generic response when user exists and dispatches reset email', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user_123',
        email: 'jane@example.com',
        password: '$2a$10$hashed_password_example',
      });

      const res = await authService.forgotPassword({ email: 'jane@example.com' });

      expect(res.message).toBe(
        'If an account exists for this email, a password reset link will be sent.',
      );
      expect(jwtServiceMock.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user_123',
          email: 'jane@example.com',
          purpose: 'password_reset',
        }),
        expect.objectContaining({
          secret: 'test-secret_$2a$10$hashed_password_example',
          expiresIn: '15m',
        }),
      );
      expect(emailServiceMock.sendPasswordResetEmail).toHaveBeenCalledWith(
        'jane@example.com',
        'http://localhost:3000/reset-password?token=mock_jwt_token_123',
      );
    });

    it('returns the same generic response when user does not exist without calling email service', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await authService.forgotPassword({ email: 'unknown@example.com' });

      expect(res.message).toBe(
        'If an account exists for this email, a password reset link will be sent.',
      );
      expect(jwtServiceMock.sign).not.toHaveBeenCalled();
      expect(emailServiceMock.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('successfully resets password with valid token and hashes new password', async () => {
      const currentHashedPassword = await bcrypt.hash('oldPassword123', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user_123',
        email: 'jane@example.com',
        password: currentHashedPassword,
      });

      jwtServiceMock.decode = vi.fn().mockReturnValue({
        sub: 'user_123',
        email: 'jane@example.com',
        purpose: 'password_reset',
      });
      jwtServiceMock.verify = vi.fn().mockReturnValue(true);

      const res = await authService.resetPassword({
        token: 'valid_reset_token',
        password: 'brandNewPassword123',
      });

      expect(res.message).toContain('Password has been reset successfully');
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_123' },
          data: expect.objectContaining({
            password: expect.any(String),
          }),
        }),
      );

      // Verify password was hashed
      const updatedPassword = prismaMock.user.update.mock.calls[0][0].data.password;
      expect(updatedPassword).not.toBe('brandNewPassword123');
      const isMatch = await bcrypt.compare('brandNewPassword123', updatedPassword);
      expect(isMatch).toBe(true);
    });

    it('rejects password shorter than 8 characters', async () => {
      await expect(
        authService.resetPassword({
          token: 'some_token',
          password: 'short',
        }),
      ).rejects.toThrow(/Password must be at least 8 characters long/);
    });

    it('rejects invalid or tampered reset token', async () => {
      jwtServiceMock.decode = vi.fn().mockReturnValue(null);

      await expect(
        authService.resetPassword({
          token: 'invalid_token',
          password: 'newValidPassword123',
        }),
      ).rejects.toThrow(/Invalid or expired password reset token/);
    });

    it('rejects reset token when verify fails (e.g. expired or already used)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user_123',
        email: 'jane@example.com',
        password: '$2a$10$new_password_hash_after_change',
      });

      jwtServiceMock.decode = vi.fn().mockReturnValue({
        sub: 'user_123',
        email: 'jane@example.com',
        purpose: 'password_reset',
      });
      jwtServiceMock.verify = vi.fn().mockImplementation(() => {
        throw new Error('jwt signature verification failed');
      });

      await expect(
        authService.resetPassword({
          token: 'already_used_token',
          password: 'anotherPassword123',
        }),
      ).rejects.toThrow(/Invalid or expired password reset token/);
    });
  });
});
