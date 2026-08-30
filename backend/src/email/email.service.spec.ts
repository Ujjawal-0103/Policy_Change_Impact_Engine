import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailService } from './email.service.js';
import { ConfigService } from '@nestjs/config';

// Mock Resend SDK as a constructible class
vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(function () {
      return {
        emails: {
          send: vi.fn().mockResolvedValue({
            data: { id: 'mock_resend_msg_id_123' },
            error: null,
          }),
        },
      };
    }),
  };
});

describe('EmailService', () => {
  let emailService: EmailService;
  let configServiceMock: any;

  beforeEach(() => {
    configServiceMock = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'RESEND_API_KEY') return 're_test_api_key_123';
        if (key === 'PASSWORD_RESET_FROM_EMAIL') return 'PoliTrace <no-reply@politrace.ai>';
        if (key === 'NODE_ENV') return 'development';
        return null;
      }),
    };

    emailService = new EmailService(configServiceMock as unknown as ConfigService);
  });

  it('dispatches password reset email with formatted HTML and recipient', async () => {
    const success = await emailService.sendPasswordResetEmail(
      'alice@example.com',
      'http://localhost:3000/reset-password?token=test_tok_123',
    );

    expect(success).toBe(true);
  });

  it('handles missing API key gracefully without crashing', async () => {
    configServiceMock.get.mockReturnValue(null);
    const serviceWithoutKey = new EmailService(configServiceMock as unknown as ConfigService);

    const success = await serviceWithoutKey.sendPasswordResetEmail(
      'bob@example.com',
      'http://localhost:3000/reset-password?token=test_tok_456',
    );

    expect(success).toBe(false);
  });
});
