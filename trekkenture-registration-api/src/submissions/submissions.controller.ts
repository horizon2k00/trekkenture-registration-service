import { Body, Controller, Logger, Param, Post } from '@nestjs/common';
import { CreateSubmissionDto } from '../dto/submission.dto';
import { EmailService } from '../email/email.service';
import { SubmissionsService } from './submissions.service';

@Controller('forms')
export class SubmissionsController {
  private readonly logger = new Logger(SubmissionsController.name);

  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly emailService: EmailService,
  ) {}

  @Post(':slug/submissions')
  async create(@Param('slug') slug: string, @Body() dto: CreateSubmissionDto) {
    const { submission, event } = await this.submissionsService.createBySlug(
      slug,
      dto,
    );
    const recipient = String(
      submission.answers['parent.primaryEmail'] ??
        submission.answers['student.email'] ??
        '',
    );
    if (recipient && this.emailService.configured) {
      const name = String(
        submission.answers['student.fullName'] ??
          submission.answers['parent.primaryName'] ??
          'Participant',
      );
      void this.emailService
        .sendThankYouEmail(recipient, name, event.name)
        .catch(() =>
          this.logger.error(
            `Confirmation email failed for submission ${submission.id}`,
          ),
        );
    }
    return {
      message: 'Submission received successfully',
      submissionId: submission.id,
      submittedAt: submission.submittedAt,
    };
  }
}
