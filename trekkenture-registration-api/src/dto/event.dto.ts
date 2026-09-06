import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SelectedQuestionDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsBoolean()
  required: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  min?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  max?: string | null;
}

// Creating and saving a draft both send its complete editable configuration.
export class SaveFormDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  name: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(255)
  slug: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  groupIds?: string[];

  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique((question: SelectedQuestionDto) => question?.id)
  @ValidateNested({ each: true })
  @Type(() => SelectedQuestionDto)
  questions: SelectedQuestionDto[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  advancePayment?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  totalPayment?: number | null;
}
