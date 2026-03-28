import { IsNotEmpty, IsObject, IsEmail, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubmissionDto {
  @ApiProperty({
    description: 'UUID of the event to submit registration for',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({
    description: 'Registration form data containing all user-submitted fields',
    example: {
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      emergencyContact: 'Jane Doe',
      medicalConditions: 'None',
    },
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsNotEmpty()
  formData: Record<string, any>;

  @ApiProperty({
    description: 'Email address for sending confirmation and updates',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string; // Required for sending confirmation email
}
