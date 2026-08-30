import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly defaultFrom: string;
  private readonly isProd: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('RESEND_API_KEY') ||
      process.env.RESEND_API_KEY;

    this.defaultFrom =
      this.configService.get<string>('PASSWORD_RESET_FROM_EMAIL') ||
      process.env.PASSWORD_RESET_FROM_EMAIL ||
      'PoliTrace <onboarding@resend.dev>';

    this.isProd =
      this.configService.get<string>('NODE_ENV') === 'production' ||
      process.env.NODE_ENV === 'production';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email client initialized successfully.');
    } else {
      this.logger.warn(
        'RESEND_API_KEY is not configured. Transactional emails will use development fallback.',
      );
    }
  }

  /**
   * Dispatches a transactional password reset email to the specified recipient.
   * Never exposes raw tokens in production logs.
   */
  async sendPasswordResetEmail(
    email: string,
    resetUrl: string,
  ): Promise<boolean> {
    if (!this.resend) {
      if (!this.isProd) {
        this.logger.log(
          `[DEV/DEMO ONLY] RESEND_API_KEY not set. Password reset URL for ${email}: ${resetUrl}`,
        );
      } else {
        this.logger.error(
          `[EMAIL ERROR] RESEND_API_KEY is missing in production. Could not dispatch reset email to recipient.`,
        );
      }
      return false;
    }

    try {
      const subject = 'Reset your PoliTrace password';

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 32px 16px; }
    .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .brand { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 24px; display: flex; align-items: center; gap: 4px; }
    .brand span { color: #2563eb; }
    .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; }
    .footer { font-size: 12px; line-height: 1.5; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 28px; }
    .fallback-url { word-break: break-all; color: #2563eb; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">Poli<span>Trace</span></div>
    <h1 class="title">Reset your password</h1>
    <p class="text">We received a request to reset your PoliTrace password. Click the button below to choose a new password.</p>
    
    <div class="btn-container">
      <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
    </div>

    <p class="text" style="font-size: 13px; color: #64748b;">
      <strong>Security notice:</strong> This link expires in <strong>15 minutes</strong>. If you did not request this password reset, you can safely ignore this email — your account remains secure.
    </p>

    <div class="footer">
      If the button above does not work, copy and paste this link into your web browser:<br>
      <a href="${resetUrl}" class="fallback-url">${resetUrl}</a>
    </div>
  </div>
</body>
</html>`;

      const text = `PoliTrace — Reset your password

We received a request to reset your PoliTrace password.

Reset your password by opening the following link in your browser:
${resetUrl}

This link expires in 15 minutes. If you did not request this, you can safely ignore this email.`;

      const { data, error } = await this.resend.emails.send({
        from: this.defaultFrom,
        to: email,
        subject,
        html,
        text,
      });

      if (error) {
        this.logger.error(
          `Resend API returned error when sending reset email: ${error.message}`,
        );
        return false;
      }

      this.logger.log(
        `Password reset email sent successfully to ${email} (Message ID: ${data?.id}).`,
      );
      return true;
    } catch (err: any) {
      this.logger.error(
        `Unexpected error occurred while dispatching email: ${err.message}`,
      );
      return false;
    }
  }
}
