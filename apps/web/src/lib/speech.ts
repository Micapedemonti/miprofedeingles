// Browser speech helpers. TTS/STT run locally in the browser until the API exposes its own audio.

const VOICE_KEY = 'mi-profe.voice';

// Higher score = sounds more natural. Names come from macOS/Chrome/Edge voice lists.
const QUALITY_HINTS: Array<[RegExp, number]> = [
  [/natural|neural|premium|enhanced|mejorada|siri/i, 50],
  [/google/i, 30],
  [/samantha|ava|allison|susan|zoe|evan|nathan|daniel|serena|kate|oliver|jamie/i, 20],
  [/compact|eloquence|albert|bad news|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox|grandpa|grandma|rocko|shelley|flo|reed|sandy/i, -100],
];

function score(voice: SpeechSynthesisVoice) {
  return QUALITY_HINTS.reduce((acc, [re, pts]) => (re.test(voice.name) ? acc + pts : acc), voice.localService ? 0 : 5);
}

/** English voices, best first. Voices load asynchronously, so call again after `onVoicesChanged`. */
export function englishVoices(lang?: string) {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.replace('_', '-').startsWith(lang ?? 'en'))
    .filter((v) => score(v) > -100)
    .sort((a, b) => score(b) - score(a));
}

export function onVoicesChanged(cb: () => void) {
  if (!('speechSynthesis' in window)) return () => {};
  window.speechSynthesis.addEventListener('voiceschanged', cb);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', cb);
}

/** "auto" (or the API's legacy default "alloy") means: pick the best available voice. */
export const AUTO_VOICE = 'auto';
const isAuto = (name: string | null | undefined) => !name || name === AUTO_VOICE || name === 'alloy';

// Local cache of the choice saved in the user's settings, so speech works before /me loads.
export const voicePref = {
  get: (): string | null => {
    try {
      const v = localStorage.getItem(VOICE_KEY);
      return isAuto(v) ? null : v;
    } catch { return null; }
  },
  set: (name: string | null) => {
    try { isAuto(name) ? localStorage.removeItem(VOICE_KEY) : localStorage.setItem(VOICE_KEY, name!); } catch { /* ignore */ }
  },
};

function pickVoice(lang: string) {
  const all = window.speechSynthesis.getVoices();
  const saved = voicePref.get();
  const chosen = saved && all.find((v) => v.name === saved);
  if (chosen) return chosen;
  return englishVoices(lang)[0] ?? englishVoices()[0] ?? null;
}

/**
 * Browsers load their voice list asynchronously; speaking before it's ready silently uses the
 * system default voice instead of the chosen one. Resolves once voices exist (or after a timeout).
 */
let voicesReady: Promise<void> | null = null;
function whenVoicesReady() {
  if (window.speechSynthesis.getVoices().length) return Promise.resolve();
  voicesReady ??= new Promise<void>((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', done);
      resolve();
    };
    window.speechSynthesis.addEventListener('voiceschanged', done);
    setTimeout(done, 1500);
  });
  return voicesReady;
}

export function speak(text: string, opts: { lang?: string; rate?: number; voiceName?: string } = {}) {
  if (!('speechSynthesis' in window)) return false;
  void whenVoicesReady().then(() => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const lang = opts.lang ?? 'en-US';
    const voice = opts.voiceName
      ? window.speechSynthesis.getVoices().find((v) => v.name === opts.voiceName) ?? null
      : pickVoice(lang);
    utterance.lang = voice?.lang ?? lang;
    if (voice) utterance.voice = voice;
    utterance.rate = opts.rate ?? 1;
    window.speechSynthesis.speak(utterance);
  });
  return true;
}

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function getRecognition(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** For each target word, whether it was heard (longest common subsequence, so order matters). */
export function heardWords(target: string, heard: string) {
  const t = target.split(/\s+/).filter(Boolean);
  const a = t.map((w) => normalize(w));
  const b = normalize(heard).split(' ').filter(Boolean);
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ok = new Array<boolean>(a.length).fill(false);
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) { ok[i] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return t.map((word, i) => ({ word, ok: ok[i] }));
}
