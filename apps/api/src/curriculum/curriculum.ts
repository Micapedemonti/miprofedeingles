import { LessonType } from '@prisma/client';

// Keep in sync with prisma/seed.ts and apps/web/src/lib/labels.ts.
export const UNITS = [
  'introductions',
  'daily_routine',
  'at_work',
  'eating_out',
  'travel',
  'remote_meetings',
  'small_talk',
  'job_interview',
] as const;

export const LESSON_ORDER: LessonType[] = [
  LessonType.LISTENING,
  LessonType.KEY_WORDS,
  LessonType.SAY_THE_PHRASE,
  LessonType.CONVERSATION,
];

/** The lesson that unlocks after finishing (unitId, lessonType), or null at the end of the course. */
export function nextLesson(unitId: string, lessonType: LessonType): { unitId: string; lessonType: LessonType } | null {
  const typeIndex = LESSON_ORDER.indexOf(lessonType);
  if (typeIndex >= 0 && typeIndex < LESSON_ORDER.length - 1) {
    return { unitId, lessonType: LESSON_ORDER[typeIndex + 1] };
  }
  const unitIndex = UNITS.indexOf(unitId as (typeof UNITS)[number]);
  if (unitIndex >= 0 && unitIndex < UNITS.length - 1) {
    return { unitId: UNITS[unitIndex + 1], lessonType: LESSON_ORDER[0] };
  }
  return null;
}
