import { useEffect, useRef, useState } from 'react';
import type { AnswerResult, GeneratedExercise } from '../lib/api';
import { api } from '../lib/api';
import { CATEGORY_LABELS, EXERCISE_LABELS } from '../lib/labels';
import { getRecognition, heardWords, speak } from '../lib/speech';

export type ExerciseResult = { correct: boolean; answer: string; xp: number };

type Props = {
  sessionId: string;
  exercise: GeneratedExercise;
  accent: string;
  rate: number;
  onResult: (r: ExerciseResult) => void;
  onNext: () => void;
};

const HIDDEN_TEXT = new Set(['LISTEN_CHOICE', 'DICTATION']);
const CHOICE = new Set(['LISTEN_CHOICE', 'FILL_GAP', 'VOCABULARY']);

export function ExerciseView({ sessionId, exercise, accent, rate, onResult, onNext }: Props) {
  const [answer, setAnswer] = useState('');
  const [confidence, setConfidence] = useState<number | undefined>(undefined);
  const [attempt, setAttempt] = useState(1);
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const play = (slow = false) => speak(exercise.englishText, { lang: accent, rate: slow ? rate * 0.7 : rate });

  useEffect(() => {
    if (HIDDEN_TEXT.has(exercise.type)) {
      const t = setTimeout(() => play(), 350);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]);

  const isChoice = CHOICE.has(exercise.type);
  const checked = result !== null;
  const builtSentence = picked.map((i) => exercise.tokens?.[i] ?? '').join(' ');
  const currentAnswer = exercise.type === 'WORD_ORDER' ? builtSentence : answer;
  const canCheck = currentAnswer.trim().length > 0 && !checked && !checking;

  async function check() {
    setChecking(true);
    setError(null);
    try {
      const res = await api.answer(sessionId, exercise.id, {
        answer: currentAnswer,
        transcript: exercise.type === 'SPEAK_ALOUD' ? currentAnswer : undefined,
        confidence: exercise.type === 'SPEAK_ALOUD' ? confidence : undefined,
      });
      setResult(res);
      onResult({ correct: res.isCorrect, answer: currentAnswer, xp: res.xpAwarded });
      if (HIDDEN_TEXT.has(exercise.type) || exercise.type === 'WORD_ORDER') play();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos comprobar tu respuesta.');
    } finally {
      setChecking(false);
    }
  }

  function retry() {
    setResult(null);
    setAnswer('');
    setConfidence(undefined);
    setAttempt((n) => n + 1);
  }

  const canRetry = !!result && !result.isCorrect && result.attemptsLeft > 0;

  return (
    <div className="exercise card">
      <div className="exercise-type">{EXERCISE_LABELS[exercise.type]}</div>
      <h2 className="exercise-instruction">{exercise.instruction}</h2>

      {HIDDEN_TEXT.has(exercise.type) && !checked ? (
        <div className="audio-row">
          <button className="audio-btn" onClick={() => play()} aria-label="Escuchar">🔊</button>
          <button className="audio-btn audio-btn-slow" onClick={() => play(true)} aria-label="Escuchar lento">🐢</button>
        </div>
      ) : exercise.type !== 'WORD_ORDER' || checked ? (
        <div className="prompt">
          <button className="audio-btn audio-btn-sm" onClick={() => play()} aria-label="Escuchar">🔊</button>
          <span className="prompt-text">{exercise.englishText}</span>
        </div>
      ) : null}

      {/* ---- Inputs ---- */}
      {isChoice && exercise.options && (
        <div className="options">
          {exercise.options.map((opt) => {
            const state = !result
              ? answer === opt ? 'option-selected' : ''
              : opt === result.correctAnswer ? 'option-correct' : answer === opt ? 'option-wrong' : '';
            return (
              <button key={opt} className={`option ${state}`} onClick={() => setAnswer(opt)} disabled={checked || checking}>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {exercise.type === 'DICTATION' && (
        <textarea
          className="input-lg"
          placeholder="Escribe lo que escuchas…"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={checked || checking}
          rows={2}
          autoFocus
        />
      )}

      {exercise.type === 'WORD_ORDER' && exercise.tokens && (
        <WordOrder tokens={exercise.tokens} picked={picked} setPicked={setPicked} disabled={checked || checking} />
      )}

      {exercise.type === 'SPEAK_ALOUD' && (
        <SpeakInput
          key={attempt}
          accent={accent}
          value={answer}
          onChange={(text, conf) => { setAnswer(text); setConfidence(conf); }}
          disabled={checked || checking}
        />
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {/* ---- Feedback ---- */}
      {result && (
        <div className={`feedback ${result.isCorrect ? 'feedback-ok' : 'feedback-bad'}`}>
          <div className="feedback-title">
            {result.isCorrect ? `¡Bien! +${result.xpAwarded} XP` : 'Casi…'}
          </div>
          {!result.isCorrect && exercise.type === 'SPEAK_ALOUD' && (
            <div className="stack">
              <div className="heard">
                {heardWords(result.correctAnswer, currentAnswer).map((w, i) => (
                  <span key={i} className={w.ok ? 'heard-ok' : 'heard-bad'}>{w.word}</span>
                ))}
              </div>
              <p className="small">
                {heardWords(result.correctAnswer, currentAnswer).every((w) => w.ok)
                  ? 'Entendí todas las palabras, pero no con claridad suficiente. Habla más despacio y marca bien los sonidos finales.'
                  : 'Las palabras en rojo no se entendieron como debían. Escúchala de nuevo (🔊) y repítela.'}
              </p>
            </div>
          )}
          {!result.isCorrect && exercise.type !== 'SPEAK_ALOUD' && (
            <p>
              <strong>Respuesta correcta:</strong> {result.correctAnswer}
              {!isChoice && (
                <>
                  <br />
                  <span className="muted">Tu respuesta: {currentAnswer}</span>
                </>
              )}
            </p>
          )}
          <p><strong>Traducción:</strong> {exercise.translation}</p>
          <p className="tip">💡 {exercise.tip}</p>
          <div className="row">
            {exercise.focusCategory && <span className="chip">{CATEGORY_LABELS[exercise.focusCategory]}</span>}
            {result.savedToNotebook && <span className="chip chip-warn">📒 Anotado en tu libreta</span>}
          </div>
        </div>
      )}

      <div className="exercise-actions">
        {!checked ? (
          <button className="btn btn-primary btn-lg" onClick={check} disabled={!canCheck}>
            {checking ? 'Comprobando…' : 'Comprobar'}
          </button>
        ) : (
          <>
            <button className={`btn btn-lg ${canRetry ? 'btn-ghost' : 'btn-primary'}`} onClick={onNext} autoFocus={!canRetry}>
              Continuar
            </button>
            {canRetry && (
              <button className="btn btn-primary btn-lg" onClick={retry}>
                Intentar de nuevo ({result.attemptsLeft})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function WordOrder({
  tokens, picked, setPicked, disabled,
}: { tokens: string[]; picked: number[]; setPicked: (p: number[]) => void; disabled: boolean }) {
  return (
    <div className="word-order">
      <div className="word-slot">
        {picked.length === 0 && <span className="muted small">Toca las palabras en orden</span>}
        {picked.map((i, pos) => (
          <button key={`${i}-${pos}`} className="token token-picked" disabled={disabled} onClick={() => setPicked(picked.filter((_, p) => p !== pos))}>
            {tokens[i]}
          </button>
        ))}
      </div>
      <div className="word-bank">
        {tokens.map((t, i) => (
          <button key={i} className="token" disabled={disabled || picked.includes(i)} onClick={() => setPicked([...picked, i])}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function SpeakInput({
  accent, value, onChange, disabled,
}: { accent: string; value: string; onChange: (text: string, confidence?: number) => void; disabled: boolean }) {
  const Recognition = getRecognition();
  const [listening, setListening] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const recRef = useRef<InstanceType<NonNullable<typeof Recognition>> | null>(null);

  useEffect(() => () => recRef.current?.stop(), []);

  function start() {
    if (!Recognition) return;
    setErr(null);
    const rec = new Recognition();
    rec.lang = accent;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const best = e.results[0]?.[0];
      onChange(best?.transcript ?? '', best?.confidence);
    };
    rec.onerror = (e) => setErr(e.error === 'not-allowed' ? 'Permite el acceso al micrófono.' : 'No te escuché bien, intenta otra vez.');
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  if (!Recognition) {
    return (
      <div className="stack">
        <p className="muted small">Tu navegador no soporta reconocimiento de voz (prueba Chrome). Léela en voz alta y escríbela:</p>
        <input className="input-lg" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      </div>
    );
  }

  return (
    <div className="speak">
      <button
        className={`mic ${listening ? 'mic-on' : ''}`}
        onClick={() => (listening ? recRef.current?.stop() : start())}
        disabled={disabled}
        aria-label={listening ? 'Detener' : 'Hablar'}
      >
        🎙️
      </button>
      <div className="muted small">{listening ? 'Escuchando…' : value ? 'Te escuché:' : 'Toca y lee la frase en voz alta'}</div>
      {value && <div className="transcript">“{value}”</div>}
      {value && !disabled && <p className="muted small">Si no es lo que dijiste, toca el micrófono y vuelve a leerla.</p>}
      {err && <div className="alert alert-error">{err}</div>}
    </div>
  );
}
