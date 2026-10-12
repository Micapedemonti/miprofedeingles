import { ErrorCategory } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength, ArrayMaxSize } from 'class-validator';

export class CreateWeaknessDto {
  @IsEnum(ErrorCategory)
  category!: ErrorCategory;

  @IsString()
  @MaxLength(500)
  wrong!: string;

  @IsString()
  @MaxLength(500)
  correct!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class CreateClassNoteDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  topics?: string[];
}
