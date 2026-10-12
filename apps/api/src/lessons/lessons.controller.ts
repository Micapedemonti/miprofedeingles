import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { LessonType, Prisma, SessionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { AiService } from '../ai/ai.service';
import { GenerateLessonDto } from './lessons.dto';

@Controller('lessons')
@UseGuards(JwtAuthGuard)
export class LessonsController {
  constructor(private readonly prisma: PrismaService, private readonly ai: AiService) {}

  @Post('generate')
  async generate(@CurrentUser() current: AuthenticatedUser, @Body() dto: GenerateLessonDto) {
    const [profile, weaknesses, classNotes] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId: current.userId } }),
      this.prisma.weakness.findMany({
        where: { userId: current.userId, count: { gt: 0 } },
        orderBy: { count: 'desc' },
        take: 3,
      }),
      this.prisma.classNote.findMany({
        where: { userId: current.userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { title: true, content: true, topics: true },
      }),
    ]);

    const lesson = await this.ai.generateLesson({
      unitId: dto.unitId,
      lessonType: dto.lessonType,
      level: dto.level ?? (profile?.cefrLevel as 'A1' | 'A2' | 'B1' | 'B2') ?? 'A2',
      interests: profile?.interests ?? [],
      goal: profile?.goal ?? 'Improve listening and speaking.',
      weaknesses,
      classNotes,
    });

    // Persist the session with private answer keys; the client only gets what it needs to render.
    const session = await this.prisma.session.create({
      data: {
        userId: current.userId,
        type: dto.lessonType === 'REVIEW' ? SessionType.REVIEW : SessionType.LESSON,
        unitId: dto.unitId,
        lessonType: dto.lessonType === 'REVIEW' ? null : (dto.lessonType as LessonType),
        exercises: {
          create: lesson.exercises.map((exercise, index) => ({
            order: index + 1,
            type: exercise.type,
            instruction: exercise.instruction,
            englishText: exercise.englishText,
            translation: exercise.translation,
            tip: exercise.tip,
            focusCategory: exercise.focusCategory,
            options: exercise.options ?? Prisma.JsonNull,
            correctAnswer: exercise.correctAnswer,
            metadata: { tokens: exercise.tokens, title: lesson.title, level: lesson.level },
          })),
        },
      },
      include: { exercises: { orderBy: { order: 'asc' } } },
    });

    return {
      sessionId: session.id,
      title: lesson.title,
      level: lesson.level,
      exercises: session.exercises.map((exercise) => ({
        id: exercise.id,
        order: exercise.order,
        type: exercise.type,
        instruction: exercise.instruction,
        // Dictation and listen-and-choose are about hearing the sentence, so the text
        // is still sent for browser TTS; the answer key itself never leaves the server.
        englishText: exercise.englishText,
        translation: exercise.translation,
        tip: exercise.tip,
        focusCategory: exercise.focusCategory,
        options: exercise.options,
        tokens: (exercise.metadata as { tokens?: string[] | null }).tokens ?? null,
      })),
    };
  }
}
