import { IsNotEmpty, IsObject } from 'class-validator';

export class CreateSubmissionDto {
  @IsObject()
  @IsNotEmpty()
  answers: Record<string, unknown>;
}
