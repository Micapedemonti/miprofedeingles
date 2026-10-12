import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AnswerExerciseDto {
  @IsString()
  @MaxLength(500)
  answer!: string;

  /** Raw speech-recognition output for SPEAK_ALOUD, stored for review. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  transcript?: string;

  /** Speech-recognition confidence (0..1) for SPEAK_ALOUD. Some browsers report 0 when unknown. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}
