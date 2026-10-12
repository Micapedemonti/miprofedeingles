import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { AuthModule } from 'src/auth/auth.module';
@Module({ imports: [AuthModule], controllers: [ProgressController] })
export class ProgressModule {}
