import { ErrorCategory, LessonType, Prisma } from '@prisma/client';

export const CATEGORY_NAMES_ES: Record<ErrorCategory, string> = {
  final_sounds: 'sonidos finales',
  contractions: 'contracciones',
  weak_forms: 'formas débiles',
  linking: 'enlace entre palabras',
  numbers: 'números',
  unknown_vocab: 'vocabulario nuevo',
  spelling: 'ortografía',
  verb_tense: 'tiempos verbales',
  articles: 'artículos',
  prepositions: 'preposiciones',
  word_order: 'orden de palabras',
  word_choice: 'elección de palabras',
};

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Consecutive days with XP, ending today (or yesterday, so the streak survives until tonight). */
export function computeStreak(days: Array<{ date: Date; xp: number }>, now = new Date()) {
  const active = new Set(days.filter((d) => d.xp > 0).map((d) => dayKey(d.date)));
  const cursor = new Date(dayKey(now));
  if (!active.has(dayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (active.has(dayKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/** Grants every achievement the user now qualifies for and returns the newly unlocked ones. */
export async function unlockAchievements(
  tx: Prisma.TransactionClient,
  userId: string,
  justCompleted: { perfect: boolean; lessonType: LessonType | null },
) {
  const [completed, xp, dailyXp, owned, all] = await Promise.all([
    tx.session.count({ where: { userId, status: 'COMPLETED' } }),
    tx.session.aggregate({ where: { userId, status: 'COMPLETED' }, _sum: { xpEarned: true } }),
    tx.dailyXp.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 60 }),
    tx.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
    tx.achievement.findMany(),
  ]);
  const totalXp = xp._sum.xpEarned ?? 0;
  const streak = computeStreak(dailyXp);

  const qualifies: Record<string, boolean> = {
    first_lesson: completed >= 1,
    ten_lessons: completed >= 10,
    xp_100: totalXp >= 100,
    xp_500: totalXp >= 500,
    streak_3: streak >= 3,
    streak_7: streak >= 7,
    perfect_lesson: justCompleted.perfect,
    first_conversation: justCompleted.lessonType === 'CONVERSATION',
  };

  const ownedIds = new Set(owned.map((o) => o.achievementId));
  const fresh = all.filter((a) => qualifies[a.code] && !ownedIds.has(a.id));
  if (fresh.length) {
    await tx.userAchievement.createMany({
      data: fresh.map((a) => ({ userId, achievementId: a.id })),
      skipDuplicates: true,
    });
  }
  return fresh.map(({ code, name, description, icon }) => ({ code, name, description, icon }));
}
