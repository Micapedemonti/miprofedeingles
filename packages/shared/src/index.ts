export const ERROR_CATEGORIES = [
  'final_sounds', 'contractions', 'weak_forms', 'linking', 'numbers',
  'unknown_vocab', 'spelling', 'verb_tense', 'articles', 'prepositions',
  'word_order', 'word_choice',
] as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];
