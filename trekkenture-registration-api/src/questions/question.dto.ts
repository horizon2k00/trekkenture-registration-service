import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AnswerType, FieldType } from './question-types';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SaveQuestionGroupDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @Transform(trim)
  @IsString()
  @MaxLength(10000)
  description = '';
}

export class SaveQuestionDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  groupId: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question: string;

  @IsIn(['text', 'dropdown', 'radio', 'checkbox'])
  fieldType: FieldType;

  @IsOptional()
  @IsIn(['string', 'number', 'date', 'email', 'phone'])
  answerType?: AnswerType | null;

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  options: string[] = [];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  min?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  max?: string | null;
}
