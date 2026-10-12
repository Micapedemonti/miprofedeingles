import { api } from '../lib/api';
import { formatDate, LESSON_TYPES, UNITS } from '../lib/labels';
import { useAsync } from '../lib/useAsync';
import { Empty, ErrorBox, Loading, Stat } from '../components/ui';

function lastDays(n: number) {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function ProgressPage() {
  const { data, error, loading, reload } = useAsync(api.progress);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? 'Sin datos'} onRetry={reload} />;

  const xpByDay = new Map(data.dailyXp.map((d) => [d.date.slice(0, 10), d.xp]));
  const days = lastDays(14);
  const maxXp = Math.max(10, ...days.map((d) => xpByDay.get(d) ?? 0));
  const accs = data.sessions.map((s) => s.accuracy).filter((a): a is number => a !== null);
  const avgAcc = accs.length ? Math.round((accs.reduce((a, b) => a + b, 0) / accs.length) * 100) : null;

  return (
    <div className="stack-lg">
      <h1>📈 Progreso</h1>
      <div className="stats">
        <Stat icon="🎓" label="Nivel" value={data.level} />
        <Stat icon="⭐" label="XP total" value={data.xpTotal} />
        <Stat icon="📚" label="Lecciones" value={data.lessonsCompleted} />
        <Stat icon="🎯" label="Precisión media" value={avgAcc !== null ? `${avgAcc}%` : '—'} />
        <Stat icon="🔥" label="Racha" value={`${data.streak} ${data.streak === 1 ? 'día' : 'días'}`} />
      </div>

      <section className="card">
        <h2>🏅 Logros · {data.achievements.filter((a) => a.unlockedAt).length}/{data.achievements.length}</h2>
        <div className="achievements">
          {data.achievements.map((a) => (
            <div key={a.code} className={`achievement ${a.unlockedAt ? '' : 'achievement-locked'}`}>
              <span className="achievement-icon">{a.icon}</span>
              <div>
                <strong>{a.name}</strong>
                <div className="muted small">{a.unlockedAt ? formatDate(a.unlockedAt) : a.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>XP · últimos 14 días</h2>
        <div className="chart" role="img" aria-label="XP por día">
          {days.map((d) => {
            const xp = xpByDay.get(d) ?? 0;
            return (
              <div key={d} className="chart-col" title={`${formatDate(d)}: ${xp} XP`}>
                <div className="chart-bar" style={{ height: `${(xp / maxXp) * 100}%` }} />
                <span className="chart-label">{new Date(d + 'T12:00').getDate()}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>Mapa de lecciones</h2>
        <div className="grid-table">
          <div />
          {LESSON_TYPES.map((t) => <div key={t.id} className="grid-head" title={t.name}>{t.emoji}</div>)}
          {UNITS.map((u) => (
            <div key={u.id} className="grid-row">
              <div className="grid-unit">{u.emoji} {u.name}</div>
              {LESSON_TYPES.map((t) => {
                const lp = data.lessonProgress.find((p) => p.unitId === u.id && p.lessonType === t.id);
                const cls = lp?.completedAt ? 'cell-done' : lp?.unlocked ? 'cell-open' : 'cell-locked';
                return (
                  <div key={t.id} className={`grid-cell ${cls}`}>
                    {lp?.completedAt ? '★'.repeat(lp.stars) || '✓' : lp?.unlocked ? '•' : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Sesiones recientes</h2>
        {data.sessions.length === 0 ? (
          <Empty icon="⏳">Todavía no hay sesiones completadas.</Empty>
        ) : (
          <ul className="session-list">
            {data.sessions.slice(0, 10).map((s) => (
              <li key={s.id}>
                <span>{formatDate(s.completedAt)}</span>
                <span className="muted">{s.type}</span>
                <span>{s.accuracy !== null ? `${Math.round(s.accuracy * 100)}%` : '—'}</span>
                <strong>+{s.xpEarned} XP</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
