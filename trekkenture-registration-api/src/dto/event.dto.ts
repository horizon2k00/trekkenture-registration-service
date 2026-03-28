import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({
    description: 'Name of the event',
    example: 'Summer Trek 2026 - Himalayan Adventure',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description:
      'URL-friendly slug for the event (lowercase, numbers, hyphens only)',
    example: 'summer-trek-2026',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must be a valid URL-friendly string (lowercase, numbers, hyphens only)',
  })
  slug: string;

  @ApiPropertyOptional({
    description:
      'Array of form section identifiers to include in the registration form',
    example: ['personal-info', 'emergency-contact', 'medical-info'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  selectedFormSections?: (string | number)[];

  @ApiPropertyOptional({
    description:
      'Array of student section identifiers for student-specific forms',
    example: ['student-id', 'institution'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentSections?: string[];

  @ApiProperty({
    description:
      'Advance payment amount required for registration (in currency units)',
    example: 5000,
    minimum: 0,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  advancePayment: number;

  @ApiProperty({
    description: 'Total payment amount for the event (in currency units)',
    example: 15000,
    minimum: 0,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  totalPayment: number;
}

export class UpdateEventDto {
  @ApiPropertyOptional({
    description: 'Name of the event',
    example: 'Summer Trek 2026 - Himalayan Adventure',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description:
      'URL-friendly slug for the event (lowercase, numbers, hyphens only)',
    example: 'summer-trek-2026',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must be a valid URL-friendly string (lowercase, numbers, hyphens only)',
  })
  slug?: string;

  @ApiPropertyOptional({
    description:
      'Array of form section identifiers to include in the registration form',
    example: ['personal-info', 'emergency-contact', 'medical-info'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  selectedFormSections?: (string | number)[];

  @ApiPropertyOptional({
    description:
      'Array of student section identifiers for student-specific forms',
    example: ['student-id', 'institution'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentSections?: string[];

  @ApiPropertyOptional({
    description:
      'Advance payment amount required for registration (in currency units)',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  advancePayment?: number;

  @ApiPropertyOptional({
    description: 'Total payment amount for the event (in currency units)',
    example: 15000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  totalPayment?: number;
}
