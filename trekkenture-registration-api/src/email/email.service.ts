import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  readonly configured: boolean;
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.configured = Boolean(host && user && pass);
    this.from =
      config.get<string>('SMTP_FROM') ??
      '"Trekkenture Team" <noreply@trekkenture.com>';
    this.transporter = this.configured
      ? createTransport({
          host,
          port: config.get<number>('SMTP_PORT', 587),
          secure: config.get<string>('SMTP_SECURE') === 'true',
          auth: { user, pass },
          disableFileAccess: true,
          disableUrlAccess: true,
        })
      : null;
    this.logger.log(
      this.configured
        ? 'SMTP confirmation email is enabled'
        : 'SMTP is not configured; confirmation email is disabled',
    );
  }

  async sendThankYouEmail(
    email: string,
    name: string,
    eventName: string,
  ): Promise<void> {
    if (!this.transporter) return;
    const safeName = escapeHtml(name);
    const safeEvent = escapeHtml(eventName);
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: `Registration received - ${eventName}`,
      text: `Dear ${name}, your registration for ${eventName} has been received.`,
      html: `<p>Dear ${safeName},</p><p>Your registration for <strong>${safeEvent}</strong> has been received.</p><p>Regards,<br>Trekkenture Team</p>`,
    });
    this.logger.log('Confirmation email sent');
  }
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] as string,
  );
}
