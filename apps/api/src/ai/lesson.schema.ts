import { z } from 'zod';

export const errorCategories = [
  'final_sounds', 'contractions', 'weak_forms', 'linking', 'numbers',
  'unknown_vocab', 'spelling', 'verb_tense', 'articles', 'prepositions',
  'word_order', 'word_choice',
] as const;

export const exerciseTypes = [
  'LISTEN_CHOICE', 'DICTATION', 'FILL_GAP', 'WORD_ORDER', 'VOCABULARY', 'SPEAK_ALOUD',
] as const;

const ExerciseBaseSchema = z.object({
  type: z.enum(exerciseTypes),
  instruction: z.string().min(3).max(180),
  englishText: z.string().min(1).max(240),
  translation: z.string().min(1).max(300),
  tip: z.string().min(1).max(300),
  focusCategory: z.enum(errorCategories).nullable(),
  options: z.array(z.string().min(1).max(180)).max(4).nullable(),
  tokens: z.array(z.string().min(1).max(80)).max(20).nullable(),
  correctAnswer: z.string().min(1).max(240),
});

export const GeneratedLessonSchema = z.object({
  title: z.string().min(2).max(100),
  level: z.enum(['A1', 'A2', 'B1', 'B2']),
  exercises: z.array(ExerciseBaseSchema).min(7).max(8),
}).superRefine((lesson, ctx) => {
  for (const [index, exercise] of lesson.exercises.entries()) {
    if (['LISTEN_CHOICE', 'FILL_GAP', 'VOCABULARY'].includes(exercise.type)) {
      if (!exercise.options || exercise.options.length !== 3) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Este tipo requiere exactamente tres opciones.', path: ['exercises', index, 'options'] });
      } else if (!exercise.options.includes(exercise.correctAnswer)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La respuesta correcta debe estar entre las opciones.', path: ['exercises', index, 'correctAnswer'] });
      }
    }
    if (['DICTATION', 'SPEAK_ALOUD'].includes(exercise.type) && exercise.options !== null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Este tipo no lleva opciones.', path: ['exercises', index, 'options'] });
    }
    if (exercise.type === 'WORD_ORDER' && (!exercise.tokens || exercise.tokens.length < 2)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ordenar palabras requiere tokens.', path: ['exercises', index, 'tokens'] });
    }
    if (exercise.type !== 'WORD_ORDER' && exercise.tokens !== null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Solo WORD_ORDER puede incluir tokens.', path: ['exercises', index, 'tokens'] });
    }
  }
});

export type GeneratedLesson = z.infer<typeof GeneratedLessonSchema>;
