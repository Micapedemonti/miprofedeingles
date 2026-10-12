import { ExerciseType } from '@prisma/client';

export const XP_PER_CORRECT = 10;
export const XP_COMPLETION_BONUS = 10;
export const XP_PERFECT_BONUS = 10;

export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Share of target words present in the attempt, order-insensitive (0..1). */
export function wordOverlap(target: string, attempt: string) {
  const targetWords = normalize(target).split(' ').filter(Boolean);
  const pool = normalize(attempt).split(' ').filter(Boolean);
  if (!targetWords.length) return 0;
  let hits = 0;
  for (const word of targetWords) {
    const i = pool.indexOf(word);
    if (i >= 0) {
      hits++;
      pool.splice(i, 1);
    }
  }
  return hits / targetWords.length;
}

export const SPEAK_MAX_ATTEMPTS = 3;
/** Below this recognizer confidence the browser was probably guessing, so the attempt fails. */
export const SPEAK_MIN_CONFIDENCE = 0.8;

const CONTRACTIONS: Record<string, string> = {
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is', "she's": 'she is',
  "it's": 'it is', "that's": 'that is', "what's": 'what is', "there's": 'there is', "let's": 'let us',
  "i've": 'i have', "you've": 'you have', "we've": 'we have', "they've": 'they have',
  "i'll": 'i will', "you'll": 'you will', "we'll": 'we will', "they'll": 'they will', "it'll": 'it will',
  "i'd": 'i would', "you'd": 'you would', "we'd": 'we would', "they'd": 'they would',
  "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "can't": 'cannot', "won't": 'will not',
  "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not', "haven't": 'have not',
  "hasn't": 'has not', "couldn't": 'could not', "wouldn't": 'would not', "shouldn't": 'should not',
};

/** Normalized words with contractions expanded, so "I'm" and "I am" compare equal. */
export function speechWords(text: string) {
  return normalize(text)
    .split(' ')
    .filter(Boolean)
    .flatMap((w) => (CONTRACTIONS[w] ?? w).split(' '));
}

/**
 * Speaking passes only if every word was recognized, in order, with good recognizer confidence.
 * The browser recognizer autocorrects toward real words, so leniency here hid real mistakes.
 */
export function gradeSpeech(target: string, transcript: string, confidence?: number) {
  const sameWords = speechWords(target).join(' ') === speechWords(transcript).join(' ');
  const confident = confidence === undefined || confidence <= 0 || confidence >= SPEAK_MIN_CONFIDENCE;
  return sameWords && confident;
}

export function gradeAnswer(type: ExerciseType, correctAnswer: string, answer: string): boolean {
  switch (type) {
    case 'LISTEN_CHOICE':
    case 'FILL_GAP':
    case 'VOCABULARY':
      return answer.trim() === correctAnswer.trim();
    case 'WORD_ORDER':
      return normalize(answer) === normalize(correctAnswer);
    case 'DICTATION':
      // Small typos are fine; missing words are not.
      return wordOverlap(correctAnswer, answer) >= 0.9;
    case 'SPEAK_ALOUD':
      return gradeSpeech(correctAnswer, answer);
    default:
      return false;
  }
}

export function starsFor(accuracy: number) {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
}
