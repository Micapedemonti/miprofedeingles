import type { ErrorCategory } from '@mi-profe/shared';
import type { ExerciseType, LessonType } from './api';

// Same order as apps/api/prisma/seed.ts
export const UNITS: Array<{ id: string; name: string; emoji: string }> = [
  { id: 'introductions', name: 'Presentaciones', emoji: '👋' },
  { id: 'daily_routine', name: 'Rutina diaria', emoji: '☀️' },
  { id: 'at_work', name: 'En el trabajo', emoji: '💼' },
  { id: 'eating_out', name: 'Comer afuera', emoji: '🍝' },
  { id: 'travel', name: 'Viajes', emoji: '✈️' },
  { id: 'remote_meetings', name: 'Reuniones remotas', emoji: '💻' },
  { id: 'small_talk', name: 'Small talk', emoji: '☕' },
  { id: 'job_interview', name: 'Entrevista de trabajo', emoji: '🤝' },
];

export const LESSON_TYPES: Array<{ id: LessonType; name: string; emoji: string; hint: string }> = [
  { id: 'LISTENING', name: 'Escuchar', emoji: '🎧', hint: 'Entender inglés hablado' },
  { id: 'KEY_WORDS', name: 'Palabras clave', emoji: '🔑', hint: 'Vocabulario de la unidad' },
  { id: 'SAY_THE_PHRASE', name: 'Dilo en voz alta', emoji: '🗣️', hint: 'Pronunciación y fluidez' },
  { id: 'CONVERSATION', name: 'Conversación', emoji: '💬', hint: 'Prepara un roleplay' },
];

export const CATEGORY_LABELS: Record<ErrorCategory, string> = {
  final_sounds: 'Sonidos finales',
  contractions: 'Contracciones',
  weak_forms: 'Formas débiles',
  linking: 'Enlace entre palabras',
  numbers: 'Números',
  unknown_vocab: 'Vocabulario nuevo',
  spelling: 'Ortografía',
  verb_tense: 'Tiempos verbales',
  articles: 'Artículos',
  prepositions: 'Preposiciones',
  word_order: 'Orden de palabras',
  word_choice: 'Elección de palabras',
};

export const EXERCISE_LABELS: Record<ExerciseType, string> = {
  LISTEN_CHOICE: 'Escucha y elige',
  DICTATION: 'Dictado',
  FILL_GAP: 'Completa',
  WORD_ORDER: 'Ordena la frase',
  VOCABULARY: 'Vocabulario',
  SPEAK_ALOUD: 'Habla',
};

export const unitName = (id: string) => UNITS.find((u) => u.id === id)?.name ?? id;

export function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}
