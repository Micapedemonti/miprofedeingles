import { Body, ConflictException, Controller, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ErrorCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { recordWeakness } from '../notebook/weakness';
import { nextLesson } from '../curriculum/curriculum';
import { AnswerExerciseDto } from './sessions.dto';
import { gradeAnswer, gradeSpeech, SPEAK_MAX_ATTEMPTS, starsFor, XP_COMPLETION_BONUS, XP_PER_CORRECT, XP_PERFECT_BONUS } from './grading';
import { CATEGORY_NAMES_ES, unlockAchievements } from './achievements';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':sessionId/exercises/:exerciseId/answer')
  async answer(
    @CurrentUser() current: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Param('exerciseId') exerciseId: string,
    @Body() dto: AnswerExerciseDto,
  ) {
    const exercise = await this.prisma.exercise.findFirst({
      where: { id: exerciseId, sessionId, session: { userId: current.userId } },
      include: { session: { select: { status: true } }, attempts: { select: { isCorrect: true } } },
    });
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado.');
    if (exercise.session.status !== 'IN_PROGRESS') throw new ConflictException('Esta lección ya terminó.');

    // Speaking can be retried a few times; every other exercise gets a single attempt.
    const isSpeech = exercise.type === 'SPEAK_ALOUD';
    const previous = exercise.attempts.length;
    const maxAttempts = isSpeech ? SPEAK_MAX_ATTEMPTS : 1;
    if (exercise.attempts.some((a) => a.isCorrect)) throw new ConflictException('Ya respondiste bien este ejercicio.');
    if (previous >= maxAttempts) throw new ConflictException('No quedan intentos para este ejercicio.');

    const correctAnswer = String(exercise.correctAnswer);
    const isCorrect = isSpeech
      ? gradeSpeech(correctAnswer, dto.answer, dto.confidence)
      : gradeAnswer(exercise.type, correctAnswer, dto.answer);
    const xpAwarded = isCorrect ? XP_PER_CORRECT : 0;
    const attemptsLeft = isCorrect ? 0 : maxAttempts - previous - 1;

    const savedToNotebook = await this.prisma.$transaction(async (tx) => {
      await tx.exerciseAttempt.create({
        data: {
          exerciseId,
          attemptNumber: previous + 1,
          answer: dto.answer,
          isCorrect,
          transcript: dto.transcript,
          xpAwarded,
        },
      });
      // Log a weakness once per exercise, not on every speaking retry.
      if (isCorrect || previous > 0 || !exercise.focusCategory || !dto.answer.trim()) return false;
      await recordWeakness(tx, current.userId, {
        category: exercise.focusCategory,
        wrong: dto.answer.slice(0, 500),
        correct: correctAnswer,
        note: exercise.tip,
      });
      return true;
    });

    return { isCorrect, correctAnswer, xpAwarded, savedToNotebook, attemptsLeft };
  }

  @Post(':sessionId/complete')
  async complete(@CurrentUser() current: AuthenticatedUser, @Param('sessionId') sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId: current.userId },
      include: { exercises: { include: { attempts: true } } },
    });
    if (!session) throw new NotFoundException('Lección no encontrada.');
    if (session.status !== 'IN_PROGRESS') throw new ConflictException('Esta lección ya se completó.');

    const total = session.exercises.length;
    const correct = session.exercises.filter((e) => e.attempts.some((a) => a.isCorrect)).length;
    const accuracy = total ? correct / total : 0;
    const perfect = total > 0 && correct === total;
    const stars = starsFor(accuracy);
    const xpEarned =
      session.exercises.reduce((sum, e) => sum + e.attempts.reduce((s, a) => s + a.xpAwarded, 0), 0) +
      XP_COMPLETION_BONUS +
      (perfect ? XP_PERFECT_BONUS : 0);

    const missed = session.exercises.filter((e) => !e.attempts.some((a) => a.isCorrect));
    const focusCategories = [...new Set(missed.map((e) => e.focusCategory).filter((c): c is ErrorCategory => !!c))];
    const summary = focusCategories.length
      ? `${correct}/${total} correctas. Para repasar: ${focusCategories.map((c) => CATEGORY_NAMES_ES[c]).join(', ')}.`
      : `${correct}/${total} correctas.`;

    const today = new Date(new Date().toISOString().slice(0, 10));

    return this.prisma.$transaction(async (tx) => {
      // Guard against double completion racing past the status check above.
      const updated = await tx.session.updateMany({
        where: { id: session.id, status: 'IN_PROGRESS' },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          score: correct,
          accuracy,
          xpEarned,
          summary,
          focusCategories,
        },
      });
      if (updated.count === 0) throw new ConflictException('Esta lección ya se completó.');

      await tx.dailyXp.upsert({
        where: { userId_date: { userId: current.userId, date: today } },
        create: { userId: current.userId, date: today, xp: xpEarned },
        update: { xp: { increment: xpEarned } },
      });

      let unlocked: { unitId: string; lessonType: string } | null = null;
      if (session.unitId && session.lessonType) {
        const key = { userId: current.userId, unitId: session.unitId, lessonType: session.lessonType };
        const previous = await tx.lessonProgress.findUnique({ where: { userId_unitId_lessonType: key } });
        await tx.lessonProgress.upsert({
          where: { userId_unitId_lessonType: key },
          create: { ...key, unlocked: true, completedAt: new Date(), bestAccuracy: accuracy, stars },
          update: {
            unlocked: true,
            completedAt: previous?.completedAt ?? new Date(),
            bestAccuracy: Math.max(previous?.bestAccuracy ?? 0, accuracy),
            stars: Math.max(previous?.stars ?? 0, stars),
          },
        });

        const next = nextLesson(session.unitId, session.lessonType);
        if (next) {
          const nextKey = { userId: current.userId, ...next };
          const nextRow = await tx.lessonProgress.findUnique({ where: { userId_unitId_lessonType: nextKey } });
          if (!nextRow?.unlocked) {
            await tx.lessonProgress.upsert({
              where: { userId_unitId_lessonType: nextKey },
              create: { ...nextKey, unlocked: true },
              update: { unlocked: true },
            });
            unlocked = next;
          }
        }
      }

      const newAchievements = await unlockAchievements(tx as Prisma.TransactionClient, current.userId, {
        perfect,
        lessonType: session.lessonType,
      });

      return { xpEarned, correct, total, accuracy, stars, summary, unlocked, newAchievements };
    });
  }
}
