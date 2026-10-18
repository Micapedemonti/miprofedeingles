import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type CompleteResult, type GeneratedExercise, type GeneratedLesson, type LessonType, type Level } from '../lib/api';
import { useAuth } from '../lib/auth';
import { LESSON_TYPES, UNITS, unitName } from '../lib/labels';
import { ErrorBox } from '../components/ui';
import { ExerciseView, type ExerciseResult } from '../components/ExerciseView';
import { Icon, LESSON_ICONS } from '../components/Icon';

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2'];

export function LessonPage() {
  const { unitId = '', lessonType = 'LISTENING' } = useParams();
  const { me } = useAuth();
  const unit = UNITS.find((u) => u.id === unitId);
  const type = LESSON_TYPES.find((t) => t.id === lessonType);

  const [level, setLevel] = useState<Level>(me?.profile?.cefrLevel ?? 'A2');
  const [lesson, setLesson] = useState<GeneratedLesson | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, ExerciseResult>>({});
  const [completion, setCompletion] = useState<CompleteResult | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const finished = !!lesson && index >= lesson.exercises.length;

  useEffect(() => {
    if (!finished || !lesson || completion) return;
    let cancelled = false;
    api.completeSession(lesson.sessionId)
      .then((res) => !cancelled && setCompletion(res))
      .catch((e) => !cancelled && setCompleteError(e instanceof Error ? e.message : 'No pudimos guardar tu progreso.'));
    return () => { cancelled = true; };
  }, [finished, lesson, completion]);

  if (!unit || !type) {
    return <ErrorBox message="Esa lección no existe." />;
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const data = await api.generateLesson({ unitId, lessonType: lessonType as LessonType, level });
      setLesson(data);
      setIndex(0);
      setResults({});
      setCompletion(null);
      setCompleteError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos generar la lección.');
    } finally {
      setGenerating(false);
    }
  }

  function onResult(exerciseId: string, result: ExerciseResult) {
    setResults((r) => ({ ...r, [exerciseId]: result }));
  }

  // ---- Intro ----
  if (!lesson) {
    return (
      <div className="lesson-intro card">
        <Link to="/" className="back"><Icon name="back" size={18} /> Volver</Link>
        <div className="intro-emoji"><Icon name={LESSON_ICONS[type.id]} size={28} /></div>
        <h1>{unit.name}</h1>
        <p className="muted">{type.name} · {type.hint}</p>
        <div className="field-inline">
          <span>Nivel</span>
          <div className="segmented">
            {LEVELS.map((l) => (
              <button key={l} className={l === level ? 'active' : ''} onClick={() => setLevel(l)} disabled={generating}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <button className="btn btn-primary btn-lg" onClick={generate} disabled={generating}>
          {generating ? 'Preparando tu lección…' : 'Generar lección'}
        </button>
        {generating && <p className="muted small">Tu profe está armando ejercicios con tus puntos débiles y notas de clase. Puede tardar unos segundos.</p>}
      </div>
    );
  }

  // ---- Summary ----
  if (finished) {
    if (!completion) {
      return (
        <div className="lesson-intro card">
          {completeError ? <ErrorBox message={completeError} /> : <><div className="spinner" /><p className="muted">Guardando tu progreso…</p></>}
        </div>
      );
    }
    const pct = Math.round(completion.accuracy * 100);
    const unlockedType = completion.unlocked && LESSON_TYPES.find((t) => t.id === completion.unlocked!.lessonType);
    return (
      <div className="lesson-intro card">
        <div className="intro-emoji"><Icon name={pct >= 80 ? 'sparkle' : 'target'} size={28} /></div>
        <h1>¡Lección terminada!</h1>
        <p className="muted">{lesson.title}</p>
        <div className="stars" aria-label={`${completion.stars} de 3 estrellas`}>
          {[1, 2, 3].map((n) => <span key={n} className={n <= completion.stars ? '' : 'off'}>★</span>)}
        </div>
        <div className="score">
          <div className="score-value">+{completion.xpEarned} XP</div>
          <div className="muted">{completion.correct} de {completion.total} correctas · {pct}%</div>
        </div>
        <p>{completion.summary}</p>

        {completion.newAchievements.length > 0 && (
          <div className="new-achievements">
            {completion.newAchievements.map((a) => (
              <div key={a.code} className="achievement">
                <span className="achievement-icon">{a.icon}</span>
                <div><strong>¡Logro nuevo! {a.name}</strong><div className="muted small">{a.description}</div></div>
              </div>
            ))}
          </div>
        )}

        {completion.unlocked && unlockedType && (
          <div className="alert alert-info">
            <Icon name="unlock" size={18} /> Desbloqueaste: {unitName(completion.unlocked.unitId)} · {unlockedType.name}
          </div>
        )}

        <ul className="result-list">
          {lesson.exercises.map((ex) => (
            <li key={ex.id}>
              {results[ex.id]?.correct
                ? <span className="result-ok" aria-label="Correcta"><Icon name="check" size={18} /></span>
                : <span className="result-bad" aria-label="Incorrecta"><Icon name="x" size={18} /></span>}
              <span>{ex.englishText}</span>
            </li>
          ))}
        </ul>
        <div className="row">
          <button className="btn btn-ghost" onClick={generate} disabled={generating}>
            {generating ? 'Generando…' : 'Repetir con ejercicios nuevos'}
          </button>
          {completion.unlocked ? (
            <Link to={`/lesson/${completion.unlocked.unitId}/${completion.unlocked.lessonType}`} className="btn btn-primary">
              Siguiente lección <Icon name="arrow" size={18} />
            </Link>
          ) : (
            <Link to="/" className="btn btn-primary">Volver al inicio</Link>
          )}
        </div>
      </div>
    );
  }

  // ---- Player ----
  const exercise: GeneratedExercise = lesson.exercises[index];
  const pct = Math.round((index / lesson.exercises.length) * 100);
  return (
    <div className="player">
      <div className="player-top">
        <Link to="/" className="close" aria-label="Salir de la lección"><Icon name="x" size={22} /></Link>
        <div className="bar"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
        <span className="muted small">{index + 1}/{lesson.exercises.length}</span>
      </div>
      <ExerciseView
        key={exercise.id}
        sessionId={lesson.sessionId}
        exercise={exercise}
        accent={me?.settings?.accent === 'EN_GB' ? 'en-GB' : 'en-US'}
        rate={me?.settings?.speechSpeed ?? 1}
        onResult={(r) => onResult(exercise.id, r)}
        onNext={() => setIndex((i) => i + 1)}
      />
    </div>
  );
}
