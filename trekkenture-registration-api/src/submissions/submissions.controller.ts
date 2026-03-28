import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from '../dto/submission.dto';
import { EmailService } from '../email/email.service';

@ApiTags('Submissions')
@Controller('submissions')
export class SubmissionsController {
  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly emailService: EmailService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit event registration',
    description:
      'Creates a new registration submission for an event. A confirmation email will be sent to the provided email address.',
  })
  @ApiBody({ type: CreateSubmissionDto })
  @ApiResponse({
    status: 201,
    description: 'Registration submitted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Submission received successfully',
        },
        submissionId: {
          type: 'string',
          format: 'uuid',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data or missing required fields',
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  async create(@Body(ValidationPipe) createSubmissionDto: CreateSubmissionDto) {
    const submission =
      await this.submissionsService.create(createSubmissionDto);

    // Send confirmation email asynchronously
    this.emailService
      .sendThankYouEmail(
        createSubmissionDto.email,
        createSubmissionDto.formData,
      )
      .catch((error) => {
        console.error('Failed to send email:', error);
        // Don't fail the request if email fails
      });

    return {
      message: 'Submission received successfully',
      submissionId: submission.id,
    };
  }
}
