import type { ErrorCategory } from '@mi-profe/shared';

// In dev Vite proxies /api to localhost:3000. In production set VITE_API_URL to the API origin
// (e.g. https://mi-profe-api.onrender.com) when the API lives on another domain.
const BASE = `${(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')}/api/v1`;
const TOKEN_KEY = 'mi-profe.token';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'No pudimos conectar con el servidor. ¿Está corriendo la API?');
  }

  if (response.status === 401 && path !== '/auth/login') {
    tokenStore.clear();
    onUnauthorized?.();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const raw = body?.message;
    const message = Array.isArray(raw) ? raw.join(' · ') : raw ?? `Error ${response.status}`;
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

// ---- Types (mirror apps/api responses) ----

export type Level = 'A1' | 'A2' | 'B1' | 'B2';
export type LessonType = 'LISTENING' | 'KEY_WORDS' | 'SAY_THE_PHRASE' | 'CONVERSATION';
export type ExerciseType = 'LISTEN_CHOICE' | 'DICTATION' | 'FILL_GAP' | 'WORD_ORDER' | 'VOCABULARY' | 'SPEAK_ALOUD';

export type Profile = {
  id: string;
  userId: string;
  cefrLevel: Level;
  interests: string[];
  goal: string;
  onboardingCompleted: boolean;
};

export type Settings = {
  dailyGoalXp: number;
  difficulty: 'EASIER' | 'NORMAL' | 'HARDER';
  accent: 'EN_US' | 'EN_GB';
  voice: string;
  speechSpeed: number;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
};

export type Me = {
  id: string;
  email: string;
  createdAt: string;
  profile: Profile | null;
  settings: Settings | null;
};

export type WeaknessExample = { wrong: string; correct: string; note: string | null; at: string };

export type Weakness = {
  id: string;
  category: ErrorCategory;
  count: number;
  lastOccurredAt: string | null;
  examples: WeaknessExample[];
};

export type ClassNote = {
  id: string;
  title: string;
  content: string;
  topics: string[];
  createdAt: string;
};

export type Notebook = {
  weaknesses: Weakness[];
  classNotes: ClassNote[];
  recentSessions: Array<{
    id: string;
    type: string;
    summary: string | null;
    focusCategories: ErrorCategory[];
    accuracy: number | null;
    completedAt: string | null;
  }>;
};

export type LessonProgress = {
  id: string;
  unitId: string;
  lessonType: LessonType;
  unlocked: boolean;
  completedAt: string | null;
  bestAccuracy: number | null;
  stars: number;
};

export type Achievement = { code: string; name: string; description: string; icon: string };

export type Progress = {
  level: Level;
  xpTotal: number;
  lessonsCompleted: number;
  streak: number;
  achievements: Array<Achievement & { unlockedAt: string | null }>;
  sessions: Array<{ id: string; xpEarned: number; accuracy: number | null; completedAt: string | null; type: string }>;
  lessonProgress: LessonProgress[];
  dailyXp: Array<{ id: string; date: string; xp: number }>;
};

export type GeneratedExercise = {
  id: string;
  order: number;
  type: ExerciseType;
  instruction: string;
  englishText: string;
  translation: string;
  tip: string;
  focusCategory: ErrorCategory | null;
  options: string[] | null;
  tokens: string[] | null;
};

export type GeneratedLesson = {
  sessionId: string;
  title: string;
  level: Level;
  exercises: GeneratedExercise[];
};

export type AnswerResult = {
  isCorrect: boolean;
  correctAnswer: string;
  xpAwarded: number;
  savedToNotebook: boolean;
  attemptsLeft: number;
};

export type CompleteResult = {
  xpEarned: number;
  correct: number;
  total: number;
  accuracy: number;
  stars: number;
  summary: string;
  unlocked: { unitId: string; lessonType: LessonType } | null;
  newAchievements: Achievement[];
};

// ---- Endpoints ----

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: { id: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<Me>('/me'),
  profile: () => request<Profile | null>('/profile'),
  updateProfile: (data: Partial<Pick<Profile, 'cefrLevel' | 'interests' | 'goal' | 'onboardingCompleted'>>) =>
    request<Profile>('/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  updateSettings: (data: Partial<Pick<Settings, 'voice' | 'speechSpeed' | 'accent'>>) =>
    request<Settings>('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  notebook: () => request<Notebook>('/notebook'),
  addWeakness: (data: { category: ErrorCategory; wrong: string; correct: string; note?: string }) =>
    request<Weakness>('/notebook/weaknesses', { method: 'POST', body: JSON.stringify(data) }),
  addClassNote: (data: { title: string; content: string; topics?: string[] }) =>
    request<ClassNote>('/notebook/class-notes', { method: 'POST', body: JSON.stringify(data) }),
  progress: () => request<Progress>('/progress'),
  generateLesson: (data: { unitId: string; lessonType: LessonType; level: Level }) =>
    request<GeneratedLesson>('/lessons/generate', { method: 'POST', body: JSON.stringify(data) }),
  answer: (sessionId: string, exerciseId: string, data: { answer: string; transcript?: string; confidence?: number }) =>
    request<AnswerResult>(`/sessions/${sessionId}/exercises/${exerciseId}/answer`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  completeSession: (sessionId: string) =>
    request<CompleteResult>(`/sessions/${sessionId}/complete`, { method: 'POST' }),
};
