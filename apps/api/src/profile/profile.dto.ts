import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength, ArrayMaxSize } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsIn(['A1', 'A2', 'B1', 'B2'])
  cefrLevel?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  goal?: string;

  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;
}
