import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateSettingsDto {
  /** Browser voice name chosen by the learner, or "auto" for the best available one. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  voice?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(1.5)
  speechSpeed?: number;

  @IsOptional()
  @IsIn(['EN_US', 'EN_GB'])
  accent?: 'EN_US' | 'EN_GB';
}
