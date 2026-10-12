import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { api, type Level } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate } from '../lib/labels';
import { VoicePicker } from '../components/VoicePicker';

const LEVELS: Array<{ id: Level; desc: string }> = [
  { id: 'A1', desc: 'Principiante' },
  { id: 'A2', desc: 'Básico' },
  { id: 'B1', desc: 'Intermedio' },
  { id: 'B2', desc: 'Intermedio alto' },
];

export function ProfilePage() {
  const { me, refresh } = useAuth();
  const profile = me?.profile;
  const [level, setLevel] = useState<Level>(profile?.cefrLevel ?? 'A2');
  const [goal, setGoal] = useState(profile?.goal ?? '');
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | string>('idle');

  useEffect(() => {
    if (profile) {
      setLevel(profile.cefrLevel);
      setGoal(profile.goal);
      setInterests(profile.interests);
    }
  }, [profile]);

  function addInterest(e?: KeyboardEvent<HTMLInputElement>) {
    if (e && e.key !== 'Enter' && e.key !== ',') return;
    e?.preventDefault();
    const value = draft.trim().replace(/,$/, '');
    if (value && !interests.includes(value) && interests.length < 20) setInterests([...interests, value]);
    setDraft('');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus('saving');
    try {
      await api.updateProfile({ cefrLevel: level, goal, interests });
      await refresh();
      setStatus('saved');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  }

  return (
    <div className="stack-lg narrow">
      <h1>👤 Perfil</h1>
      <div className="card">
        <div className="muted small">Cuenta</div>
        <div><strong>{me?.email}</strong></div>
        {me?.createdAt && <div className="muted small">Desde {formatDate(me.createdAt)}</div>}
      </div>

      <form className="card form" onSubmit={submit}>
        <div className="field">
          <span>Nivel</span>
          <div className="level-grid">
            {LEVELS.map((l) => (
              <button type="button" key={l.id} className={`level-opt ${level === l.id ? 'active' : ''}`} onClick={() => setLevel(l.id)}>
                <strong>{l.id}</strong>
                <span className="small">{l.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Mi objetivo</span>
          <textarea value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={1000} rows={3} />
        </label>

        <div className="field">
          <span>Intereses</span>
          <div className="chips">
            {interests.map((i) => (
              <button type="button" key={i} className="chip chip-removable" onClick={() => setInterests(interests.filter((x) => x !== i))}>
                {i} ✕
              </button>
            ))}
          </div>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={addInterest}
            onBlur={() => addInterest()}
            placeholder="Escribe y presiona Enter (ej: music)"
          />
        </div>

        {status !== 'idle' && status !== 'saving' && status !== 'saved' && <div className="alert alert-error">{status}</div>}
        <button className="btn btn-primary" disabled={status === 'saving'}>
          {status === 'saving' ? 'Guardando…' : status === 'saved' ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </form>

      <VoicePicker />
    </div>
  );
}
