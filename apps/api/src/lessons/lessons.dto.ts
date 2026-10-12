import { IsIn, IsString, MaxLength } from 'class-validator';

export class GenerateLessonDto {
  @IsString()
  @MaxLength(80)
  unitId!: string;

  @IsIn(['LISTENING', 'KEY_WORDS', 'SAY_THE_PHRASE', 'CONVERSATION', 'REVIEW'])
  lessonType!: string;

  @IsIn(['A1', 'A2', 'B1', 'B2'])
  level!: 'A1' | 'A2' | 'B1' | 'B2';
}
