import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  async sendThankYouEmail(
    email: string,
    formData: Record<string, any>,
  ): Promise<void> {
    const userName = formData.name || formData.fullName || 'Participant';

    await this.mailerService.sendMail({
      to: email,
      subject: 'Thank You for Your Registration - Trekkenture',
      template: './thank-you', // references thank-you.hbs in templates folder
      context: {
        name: userName,
        formData: formData,
        year: new Date().getFullYear(),
      },
    });
  }

  async sendCustomEmail(
    to: string,
    subject: string,
    template: string,
    context: any,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject,
      template: `./${template}`,
      context,
    });
  }
}
