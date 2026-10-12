import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';
import { NotebookModule } from './notebook/notebook.module';
import { ProgressModule } from './progress/progress.module';
import { AiModule } from './ai/ai.module';
import { LessonsModule } from './lessons/lessons.module';
import { SessionsModule } from './sessions/sessions.module';
import { SettingsModule } from './settings/settings.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    NotebookModule,
    ProgressModule,
    AiModule,
    LessonsModule,
    SessionsModule,
    SettingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
