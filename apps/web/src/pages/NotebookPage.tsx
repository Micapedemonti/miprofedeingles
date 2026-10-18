import { useState, type FormEvent } from 'react';
import { ERROR_CATEGORIES, type ErrorCategory } from '@mi-profe/shared';
import { api, type Notebook } from '../lib/api';
import { CATEGORY_LABELS, formatDate } from '../lib/labels';
import { useAsync } from '../lib/useAsync';
import { Empty, ErrorBox, Loading } from '../components/ui';

export function NotebookPage() {
  const { data, error, loading, reload } = useAsync(api.notebook);
  const [tab, setTab] = useState<'weak' | 'notes'>('weak');

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? 'Sin datos'} onRetry={reload} />;

  return (
    <div className="stack-lg">
      <div className="page-head">
        <div>
          <h1>Mi libreta</h1>
          <p className="page-sub">Lo que más se te escapa, con tus propios ejemplos.</p>
        </div>
        <div className="segmented">
          <button className={tab === 'weak' ? 'active' : ''} onClick={() => setTab('weak')}>
            Puntos débiles ({data.weaknesses.length})
          </button>
          <button className={tab === 'notes' ? 'active' : ''} onClick={() => setTab('notes')}>
            Notas de clase ({data.classNotes.length})
          </button>
        </div>
      </div>
      {tab === 'weak' ? <Weaknesses data={data} onSaved={reload} /> : <ClassNotes data={data} onSaved={reload} />}
    </div>
  );
}

function Weaknesses({ data, onSaved }: { data: Notebook; onSaved: () => void }) {
  const [category, setCategory] = useState<ErrorCategory>('verb_tense');
  const [wrong, setWrong] = useState('');
  const [correct, setCorrect] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const max = Math.max(1, ...data.weaknesses.map((w) => w.count));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.addWeakness({ category, wrong, correct, note: note || undefined });
      setWrong('');
      setCorrect('');
      setNote('');
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="two-col">
      <div className="stack">
        {data.weaknesses.length === 0 ? (
          <Empty icon="sprout">Aún no hay errores registrados. Se guardan desde las lecciones o con el formulario.</Empty>
        ) : (
          data.weaknesses.map((w) => (
            <article key={w.id} className="card weak">
              <div className="weak-head">
                <h3>{CATEGORY_LABELS[w.category]}</h3>
                <span className="weak-count">{w.count} {w.count === 1 ? 'vez' : 'veces'}</span>
              </div>
              <div className="bar bar-thin"><div className="bar-fill bar-warn" style={{ width: `${(w.count / max) * 100}%` }} /></div>
              <ul className="examples">
                {w.examples.map((ex, i) => (
                  <li key={i}>
                    <div className="ex-wrong">{ex.wrong}</div>
                    <div className="ex-right">{ex.correct}</div>
                    {ex.note && <div className="muted small">{ex.note}</div>}
                  </li>
                ))}
              </ul>
              {w.lastOccurredAt && <div className="muted small">Última vez: {formatDate(w.lastOccurredAt)}</div>}
            </article>
          ))
        )}
      </div>
      <form className="card form sticky" onSubmit={submit}>
        <h3>Registrar un error</h3>
        <label className="field">
          <span>Categoría</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as ErrorCategory)}>
            {ERROR_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Lo que dije</span>
          <input value={wrong} onChange={(e) => setWrong(e.target.value)} maxLength={500} required placeholder="Yesterday I go running." />
        </label>
        <label className="field">
          <span>Lo correcto</span>
          <input value={correct} onChange={(e) => setCorrect(e.target.value)} maxLength={500} required placeholder="Yesterday I went running." />
        </label>
        <label className="field">
          <span>Nota (opcional)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} />
        </label>
        {err && <div className="alert alert-error">{err}</div>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </form>
    </div>
  );
}

function ClassNotes({ data, onSaved }: { data: Notebook; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topics, setTopics] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.addClassNote({
        title,
        content,
        topics: topics.split(',').map((t) => t.trim()).filter(Boolean),
      });
      setTitle('');
      setContent('');
      setTopics('');
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="two-col">
      <div className="stack">
        {data.classNotes.length === 0 ? (
          <Empty icon="note">Anota lo que viste con tu profe. Las lecciones lo usan para conectar con tu clase.</Empty>
        ) : (
          data.classNotes.map((n) => (
            <article key={n.id} className="card note">
              <div className="weak-head">
                <h3>{n.title}</h3>
                <span className="muted small">{formatDate(n.createdAt)}</span>
              </div>
              <p className="note-content">{n.content}</p>
              {n.topics.length > 0 && (
                <div className="chips">{n.topics.map((t) => <span key={t} className="chip">{t}</span>)}</div>
              )}
            </article>
          ))
        )}
      </div>
      <form className="card form sticky" onSubmit={submit}>
        <h3>Nueva nota de clase</h3>
        <label className="field">
          <span>Título</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="Clase del viernes" />
        </label>
        <label className="field">
          <span>¿Qué vieron?</span>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} rows={5} required />
        </label>
        <label className="field">
          <span>Temas (separados por coma)</span>
          <input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="past_simple, questions" />
        </label>
        {err && <div className="alert alert-error">{err}</div>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar nota'}</button>
      </form>
    </div>
  );
}
