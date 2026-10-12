import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { CATEGORY_LABELS, LESSON_TYPES, UNITS } from '../lib/labels';
import { useAsync } from '../lib/useAsync';
import { ErrorBox, Loading } from '../components/ui';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function HomePage() {
  const { me } = useAuth();
  const { data, error, loading, reload } = useAsync(() => Promise.all([api.progress(), api.notebook()]));

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? 'Sin datos'} onRetry={reload} />;

  const [progress, notebook] = data;
  const goal = me?.settings?.dailyGoalXp ?? 50;
  const todayXp = progress.dailyXp.find((d) => d.date.slice(0, 10) === todayKey())?.xp ?? 0;
  const pct = Math.min(100, Math.round((todayXp / goal) * 100));
  const topWeak = notebook.weaknesses.slice(0, 3);
  const byKey = new Map(progress.lessonProgress.map((lp) => [`${lp.unitId}:${lp.lessonType}`, lp]));

  return (
    <div className="stack-lg">
      <section className="hero card">
        <div>
          <h1>¡Hola! 👋</h1>
          <p className="muted">
            Nivel <strong>{progress.level}</strong> · {progress.xpTotal} XP en total · {progress.lessonsCompleted} lecciones completadas
            {progress.streak > 0 && <> · 🔥 {progress.streak} {progress.streak === 1 ? 'día' : 'días'} seguidos</>}
          </p>
        </div>
        <div className="goal">
          <div className="goal-head">
            <span>Meta de hoy</span>
            <strong>{todayXp} / {goal} XP</strong>
          </div>
          <div className="bar"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
        </div>
      </section>

      {topWeak.length > 0 && (
        <section className="card focus">
          <h2>🎯 En qué te vas a enfocar</h2>
          <p className="muted">Las lecciones nuevas reciclan tus puntos débiles a propósito.</p>
          <div className="chips">
            {topWeak.map((w) => (
              <span key={w.id} className="chip chip-warn">{CATEGORY_LABELS[w.category]} · {w.count}</span>
            ))}
          </div>
        </section>
      )}

      <section className="stack">
        <h2>Unidades</h2>
        <div className="units">
          {UNITS.map((unit, i) => {
            const lessons = LESSON_TYPES.map((t) => ({ type: t, lp: byKey.get(`${unit.id}:${t.id}`) }));
            const done = lessons.filter((l) => l.lp?.completedAt).length;
            return (
              <article key={unit.id} className="unit card">
                <header className="unit-head">
                  <span className="unit-emoji">{unit.emoji}</span>
                  <div>
                    <div className="unit-num">Unidad {i + 1}</div>
                    <h3>{unit.name}</h3>
                  </div>
                  <span className="unit-done">{done}/4</span>
                </header>
                <div className="lessons">
                  {lessons.map(({ type, lp }) => {
                    const status = lp?.completedAt ? 'done' : lp?.unlocked ? 'open' : 'locked';
                    const content = (
                      <>
                        <span className="lesson-emoji">{type.emoji}</span>
                        <span className="lesson-name">{type.name}</span>
                        <span className="lesson-status">
                          {status === 'done' ? '★'.repeat(lp?.stars ?? 0) || '✓' : status === 'open' ? 'Empezar' : '🔒'}
                        </span>
                      </>
                    );
                    return status === 'locked' ? (
                      <div key={type.id} className="lesson lesson-locked" title="Completa la lección anterior para desbloquearla">
                        {content}
                      </div>
                    ) : (
                      <Link key={type.id} to={`/lesson/${unit.id}/${type.id}`} className={`lesson lesson-${status}`} title={type.hint}>
                        {content}
                      </Link>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
