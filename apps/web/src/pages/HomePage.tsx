import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { CATEGORY_LABELS, LESSON_TYPES, UNITS } from '../lib/labels';
import { useAsync } from '../lib/useAsync';
import { ErrorBox, Loading } from '../components/ui';
import { Icon, LESSON_ICONS } from '../components/Icon';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const RING_R = 25;
const RING_C = 2 * Math.PI * RING_R;

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

  // First lesson that is unlocked but not finished: the "keep going" card.
  const nextLesson = UNITS
    .flatMap((unit, unitIndex) => LESSON_TYPES.map((type, typeIndex) => ({ unitIndex, typeIndex, lp: byKey.get(`${unit.id}:${type.id}`) })))
    .find(({ lp }) => lp?.unlocked && !lp.completedAt) ?? null;
  const nextUnit = nextLesson ? UNITS[nextLesson.unitIndex] : null;
  const nextType = nextLesson ? LESSON_TYPES[nextLesson.typeIndex] : null;
  const unitsDone = UNITS.filter((u) => LESSON_TYPES.every((t) => byKey.get(`${u.id}:${t.id}`)?.completedAt)).length;
  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="stack-lg">
      <div className="greet">
        <span className="greet-date">{today}</span>
        <h1>Hola</h1>
      </div>

      <div className="home-top">
        {nextUnit && nextType && nextLesson ? (
          <section className="continue">
            <div className="stack" style={{ gap: '0.4rem' }}>
              <span className="continue-label">Sigue donde quedaste</span>
              <span className="continue-title">{nextUnit.name}</span>
              <span className="continue-sub">Unidad {nextLesson.unitIndex + 1} · {nextType.name}</span>
            </div>
            <Link to={`/lesson/${nextUnit.id}/${nextType.id}`} className="btn">
              Continuar <Icon name="arrow" />
            </Link>
          </section>
        ) : (
          <section className="continue">
            <div className="stack" style={{ gap: '0.4rem' }}>
              <span className="continue-label">Terminaste todas las lecciones</span>
              <span className="continue-title">¡Bien hecho!</span>
              <span className="continue-sub">Repite cualquier lección para practicar con ejercicios nuevos.</span>
            </div>
          </section>
        )}

        <div className="home-side">
          <section className="card goal">
            <svg className="goal-ring" width="68" height="68" viewBox="0 0 60 60" role="img" aria-label={`Meta de hoy: ${pct}%`}>
              <circle cx="30" cy="30" r={RING_R} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
              <circle
                cx="30" cy="30" r={RING_R} fill="none" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * RING_C} ${RING_C}`} transform="rotate(-90 30 30)"
              />
            </svg>
            <div>
              <div className="goal-label">Meta de hoy</div>
              <div className="goal-value">{todayXp} de {goal} XP</div>
              <div className="muted small">
                Nivel {progress.level}
                {progress.streak > 0 && <> · {progress.streak} {progress.streak === 1 ? 'día' : 'días'} seguidos</>}
              </div>
            </div>
          </section>

          {topWeak.length > 0 && (
            <section className="card focus">
              <div>
                <h2>Hoy repasamos</h2>
                <p className="muted small">Las lecciones nuevas reciclan lo que más se te escapa.</p>
              </div>
              <div className="chips">
                {topWeak.map((w) => (
                  <span key={w.id} className="chip chip-warn">
                    {CATEGORY_LABELS[w.category]} <span className="chip-count">{w.count}</span>
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <section className="stack">
        <div className="section-head">
          <h2>Unidades</h2>
          <span className="muted small">{unitsDone} de {UNITS.length} completas</span>
        </div>
        <div className="units">
          {UNITS.map((unit, i) => {
            const lessons = LESSON_TYPES.map((t) => ({ type: t, lp: byKey.get(`${unit.id}:${t.id}`) }));
            const done = lessons.filter((l) => l.lp?.completedAt).length;
            const current = nextUnit?.id === unit.id;
            return (
              <article key={unit.id} className={`unit card ${current ? 'unit-current' : ''}`}>
                <header className="unit-head">
                  <div>
                    <div className="unit-num">Unidad {i + 1}</div>
                    <h3 className="unit-name">{unit.name}</h3>
                  </div>
                  <div className="dots" aria-label={`${done} de 4 lecciones`}>
                    {lessons.map(({ type, lp }) => (
                      <span key={type.id} className={`dot ${lp?.completedAt ? 'dot-done' : lp?.unlocked ? 'dot-open' : ''}`} />
                    ))}
                  </div>
                </header>
                <div className="lessons">
                  {lessons.map(({ type, lp }) => {
                    const status = lp?.completedAt ? 'done' : lp?.unlocked ? 'open' : 'locked';
                    const content = (
                      <>
                        <span className="lesson-emoji"><Icon name={LESSON_ICONS[type.id]} size={18} /></span>
                        <span className="lesson-name">{type.name}</span>
                        <span className="lesson-status">
                          {status === 'done'
                            ? '★'.repeat(lp?.stars ?? 0) || <Icon name="check" size={16} />
                            : status === 'open' ? <Icon name="arrow" size={16} /> : <Icon name="lock" size={16} />}
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
