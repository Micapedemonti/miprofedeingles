import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { computeStreak } from '../sessions/achievements';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getProgress(@CurrentUser() current: AuthenticatedUser) {
    const [profile, sessions, lessonProgress, dailyXp, achievements, owned] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId: current.userId } }),
      this.prisma.session.findMany({
        where: { userId: current.userId, status: 'COMPLETED' },
        select: { id: true, xpEarned: true, accuracy: true, completedAt: true, type: true },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.lessonProgress.findMany({
        where: { userId: current.userId },
        orderBy: [{ unitId: 'asc' }, { lessonType: 'asc' }],
      }),
      this.prisma.dailyXp.findMany({
        where: { userId: current.userId },
        orderBy: { date: 'desc' },
        take: 60,
      }),
      this.prisma.achievement.findMany({ orderBy: { code: 'asc' } }),
      this.prisma.userAchievement.findMany({ where: { userId: current.userId } }),
    ]);
    const xpTotal = sessions.reduce((sum, session) => sum + session.xpEarned, 0);
    const lessonsCompleted = lessonProgress.filter((lesson) => lesson.completedAt).length;
    const unlockedAt = new Map(owned.map((o) => [o.achievementId, o.unlockedAt]));
    return {
      level: profile?.cefrLevel ?? 'A2',
      xpTotal,
      lessonsCompleted,
      streak: computeStreak(dailyXp),
      sessions,
      lessonProgress,
      dailyXp,
      achievements: achievements.map(({ id, code, name, description, icon }) => ({
        code, name, description, icon, unlockedAt: unlockedAt.get(id) ?? null,
      })),
    };
  }
}
