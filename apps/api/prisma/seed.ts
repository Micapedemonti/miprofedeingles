import { PrismaClient, LessonType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const units = [
  'introductions',
  'daily_routine',
  'at_work',
  'eating_out',
  'travel',
  'remote_meetings',
  'small_talk',
  'job_interview',
];

async function main() {
  const email = process.env.BOOTSTRAP_EMAIL;
  const password = process.env.BOOTSTRAP_PASSWORD;
  if (!email || !password || password === 'change-this-password-now') {
    throw new Error('Set BOOTSTRAP_EMAIL and a non-default BOOTSTRAP_PASSWORD in .env before seeding.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      profile: { create: { cefrLevel: 'A2', interests: ['technology', 'running', 'travel'] } },
      settings: { create: { dailyGoalXp: 50 } },
    },
  });

  for (let i = 0; i < units.length; i++) {
    for (let j = 0; j < 4; j++) {
      const lessonType = [LessonType.LISTENING, LessonType.KEY_WORDS, LessonType.SAY_THE_PHRASE, LessonType.CONVERSATION][j];
      await prisma.lessonProgress.upsert({
        where: { userId_unitId_lessonType: { userId: user.id, unitId: units[i], lessonType } },
        update: {},
        create: {
          userId: user.id,
          unitId: units[i],
          lessonType,
          unlocked: i === 0 && j === 0,
        },
      });
    }
  }

  const achievements = [
    ['first_lesson', 'Primera lección', 'Completa tu primera lección.', '🎯'],
    ['streak_3', 'Tres días seguidos', 'Practica tres días seguidos.', '🔥'],
    ['streak_7', 'Una semana', 'Practica siete días seguidos.', '🗓️'],
    ['xp_100', '100 XP', 'Acumula 100 XP.', '⭐'],
    ['xp_500', '500 XP', 'Acumula 500 XP.', '🏆'],
    ['perfect_lesson', 'Lección perfecta', 'Completa una lección sin errores.', '💯'],
    ['ten_lessons', 'Diez lecciones', 'Completa diez lecciones.', '📚'],
    ['first_conversation', 'Primera conversación', 'Termina tu primer roleplay.', '💬'],
  ];
  for (const [code, name, description, icon] of achievements) {
    await prisma.achievement.upsert({
      where: { code },
      update: { name, description, icon },
      create: { code, name, description, icon },
    });
  }

  console.log(`Seed complete for user ${user.email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
