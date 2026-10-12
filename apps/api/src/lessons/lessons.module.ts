import { Module } from '@nestjs/common';
import { LessonsController } from './lessons.controller';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({ imports: [AiModule,AuthModule], controllers: [LessonsController] })
export class LessonsModule {}
