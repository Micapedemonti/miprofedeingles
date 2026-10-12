import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { AUTO_VOICE, englishVoices, onVoicesChanged, speak, voicePref } from '../lib/speech';

const SAMPLE = "Hi! I'm your English teacher. What did you do yesterday?";

export function VoicePicker() {
  const [voices, setVoices] = useState(() => englishVoices());
  const { refresh } = useAuth();
  const [selected, setSelected] = useState<string | null>(voicePref.get());
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => onVoicesChanged(() => setVoices(englishVoices())), []);

  if (!('speechSynthesis' in window)) {
    return <p className="muted small">Tu navegador no permite elegir voces.</p>;
  }

  const auto = voices[0]?.name ?? null;

  async function choose(name: string | null) {
    setSelected(name);
    voicePref.set(name);
    speak(SAMPLE, { voiceName: name ?? auto ?? undefined });
    setSaveState('saving');
    try {
      await api.updateSettings({ voice: name ?? AUTO_VOICE });
      await refresh();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }

  const missingHere = selected && voices.length > 0 && !voices.some((v) => v.name === selected);

  return (
    <div className="card form">
      <div>
        <h3>🔊 Voz en inglés</h3>
        <p className="muted small">
          Toca una voz para escucharla y elegirla. Se guarda en tu cuenta.{' '}
          {saveState === 'saving' && 'Guardando…'}
          {saveState === 'saved' && '✓ Guardada'}
          {saveState === 'error' && <span style={{ color: 'var(--bad)' }}>No se pudo guardar, intenta de nuevo.</span>}
        </p>
        {missingHere && (
          <p className="small" style={{ color: 'var(--warn)' }}>
            Tu voz guardada (“{selected}”) no existe en este dispositivo, así que se usa la automática. Elige otra si quieres.
          </p>
        )}
      </div>
      {voices.length === 0 ? (
        <p className="muted small">Cargando voces…</p>
      ) : (
        <div className="voice-list">
          <button type="button" className={`voice ${selected === null ? 'active' : ''}`} onClick={() => choose(null)}>
            <span className="voice-name">✨ Automática</span>
            <span className="muted small">{auto ? `La mejor disponible: ${auto}` : ''}</span>
          </button>
          {voices.map((v) => (
            <button
              type="button"
              key={v.name}
              className={`voice ${selected === v.name ? 'active' : ''}`}
              onClick={() => choose(v.name)}
            >
              <span className="voice-name">{v.name}</span>
              <span className="muted small">{v.lang}{v.localService ? '' : ' · online'}</span>
            </button>
          ))}
        </div>
      )}
      <p className="muted small">
        ¿Todas suenan robóticas? En Mac puedes descargar voces mucho mejores: Ajustes del Sistema → Accesibilidad →
        Contenido leído → Voz del sistema → Gestionar voces, y baja una voz en inglés “Mejorada” o “Premium”
        (por ejemplo Ava o Zoe). Después recarga esta página.
      </p>
    </div>
  );
}
