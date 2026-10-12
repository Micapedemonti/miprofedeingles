import { gradeAnswer, gradeSpeech, starsFor } from '../src/sessions/grading';
import { computeStreak } from '../src/sessions/achievements';
import { nextLesson } from '../src/curriculum/curriculum';

describe('gradeAnswer', () => {
  it('requires the exact option for choice exercises', () => {
    expect(gradeAnswer('LISTEN_CHOICE', "I'm tired", "I'm tired")).toBe(true);
    expect(gradeAnswer('LISTEN_CHOICE', "I'm tired", 'I tired')).toBe(false);
  });

  it('ignores case and punctuation in word order', () => {
    expect(gradeAnswer('WORD_ORDER', 'I usually get up at seven.', 'i usually get up at seven')).toBe(true);
    expect(gradeAnswer('WORD_ORDER', 'I usually get up at seven.', 'I get up usually at seven')).toBe(false);
  });

  it('tolerates a small slip in dictation but not missing words', () => {
    const target = 'I usually have coffee before work every morning';
    expect(gradeAnswer('DICTATION', target, 'I usually have coffee before work every morning!')).toBe(true);
    expect(gradeAnswer('DICTATION', target, 'I have coffee before work')).toBe(false);
  });

  it('requires every spoken word, in order', () => {
    expect(gradeAnswer('SPEAK_ALOUD', 'What time do you start work?', 'what time do you start work')).toBe(true);
    expect(gradeAnswer('SPEAK_ALOUD', 'What time do you start work?', 'what time do you star work')).toBe(false);
    expect(gradeAnswer('SPEAK_ALOUD', 'What time do you start work?', 'what time you start work')).toBe(false);
  });
});

describe('gradeSpeech', () => {
  it('treats contractions and their long form as equal', () => {
    expect(gradeSpeech("I'm going to work", 'I am going to work', 0.92)).toBe(true);
  });

  it('fails a low-confidence match even if the words line up', () => {
    expect(gradeSpeech('I like coffee', 'I like coffee', 0.55)).toBe(false);
  });

  it('ignores a confidence of 0 (browsers that do not report it)', () => {
    expect(gradeSpeech('I like coffee', 'I like coffee', 0)).toBe(true);
  });
});

describe('starsFor', () => {
  it('maps accuracy to 1-3 stars', () => {
    expect(starsFor(1)).toBe(3);
    expect(starsFor(0.75)).toBe(2);
    expect(starsFor(0.2)).toBe(1);
  });
});

describe('computeStreak', () => {
  const now = new Date('2026-10-11T15:00:00Z');
  const day = (s: string, xp = 20) => ({ date: new Date(s), xp });

  it('counts consecutive days ending today', () => {
    expect(computeStreak([day('2026-10-11'), day('2026-10-10'), day('2026-10-09'), day('2026-10-07')], now)).toBe(3);
  });

  it('keeps yesterday’s streak alive before practicing today', () => {
    expect(computeStreak([day('2026-10-10'), day('2026-10-09')], now)).toBe(2);
  });

  it('is zero after a missed day', () => {
    expect(computeStreak([day('2026-10-08')], now)).toBe(0);
  });
});

describe('nextLesson', () => {
  it('moves to the next lesson type, then the next unit', () => {
    expect(nextLesson('introductions', 'LISTENING')).toEqual({ unitId: 'introductions', lessonType: 'KEY_WORDS' });
    expect(nextLesson('introductions', 'CONVERSATION')).toEqual({ unitId: 'daily_routine', lessonType: 'LISTENING' });
    expect(nextLesson('job_interview', 'CONVERSATION')).toBeNull();
  });
});
