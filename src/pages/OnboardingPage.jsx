import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const POSITIONS = [
  { id:'GK',  name:'Arquero',     emoji:'🧤' },
  { id:'DEF', name:'Defensor',    emoji:'🛡️' },
  { id:'MID', name:'Mediocampo',  emoji:'⚙️' },
  { id:'WNG', name:'Extremo',     emoji:'⚡' },
  { id:'FWD', name:'Delantero',   emoji:'🎯' },
];

const BASE_STATS = { vel:50, tec:50, def:50, tir:50, sta:50, fis:50 };

export default function OnboardingPage({ user, onComplete }) {
  const [step,     setStep]     = useState(1); // 1=nickname, 2=position, 3=photo
  const [nickname, setNickname] = useState('');
  const [position, setPosition] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  async function finish() {
    if (!nickname.trim() || !position) return;
    setSaving(true);
    try {
      const playerData = {
        id:       user.uid,
        nickname: nickname.trim(),
        position,
        photo:    null,
        photos:   [],
        emoji:    '⚽',
        ...BASE_STATS,
        createdAt: Date.now(),
        logros:   [],
      };
      // Save player profile
      await setDoc(doc(db, 'players', user.uid), playerData);
      // Mark user as onboarded
      await setDoc(doc(db, 'users', user.uid), {
        uid:        user.uid,
        email:      user.email,
        displayName:user.displayName,
        playerId:   user.uid,
        isAdmin:    false,
        onboarded:  true,
        createdAt:  Date.now(),
      });
      onComplete();
    } catch(e) {
      setError('Error al guardar. Intenta de nuevo.');
      setSaving(false);
    }
  }

  return (
    <div className="onboarding-wrap">
      <div className="onboarding-card">

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>⚽</div>
          <div style={{ fontFamily:'Barlow Condensed', fontSize:32, fontWeight:900, letterSpacing:1 }}>
            BalanceFC
          </div>
          <div style={{ color:'var(--muted)', fontSize:13, marginTop:4 }}>
            Configura tu perfil para empezar
          </div>
        </div>

        {/* Steps indicator */}
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:28 }}>
          {[1,2].map(s => (
            <div key={s} style={{
              width: step >= s ? 24 : 8, height:8, borderRadius:4,
              background: step >= s ? 'var(--accent)' : 'var(--border2)',
              transition:'all .3s'
            }} />
          ))}
        </div>

        {/* Step 1 — Nickname */}
        {step === 1 && (
          <div>
            <div className="ob-label">¿Cómo te llaman en la cancha?</div>
            <input
              autoFocus
              placeholder="Tu apodo..."
              maxLength={16}
              value={nickname}
              onChange={e => { setNickname(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && nickname.trim().length >= 2 && setStep(2)}
              style={{ fontSize:18, fontWeight:700, textAlign:'center', marginBottom:8 }}
            />
            <div style={{ color:'var(--muted)', fontSize:11, textAlign:'center', marginBottom:20 }}>
              Máx. 16 caracteres — este es el nombre que verán todos
            </div>
            {error && <div style={{ color:'var(--red)', fontSize:12, textAlign:'center', marginBottom:12 }}>{error}</div>}
            <button className="btn btn-ac btn-full"
              disabled={nickname.trim().length < 2}
              onClick={() => nickname.trim().length >= 2 && setStep(2)}>
              Continuar →
            </button>
          </div>
        )}

        {/* Step 2 — Position */}
        {step === 2 && (
          <div>
            <div className="ob-label">¿Cuál es tu posición preferida?</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
              {POSITIONS.map(p => (
                <button key={p.id}
                  onClick={() => setPosition(p.id)}
                  style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'12px 16px', borderRadius:12, cursor:'pointer',
                    border: `2px solid ${position === p.id ? 'var(--accent)' : 'var(--border2)'}`,
                    background: position === p.id ? 'rgba(0,229,255,.1)' : 'var(--surface2)',
                    color:'var(--text)', fontSize:15, fontWeight:600,
                    transition:'all .15s'
                  }}>
                  <span style={{ fontSize:22 }}>{p.emoji}</span>
                  <span>{p.name}</span>
                  {position === p.id && <span style={{ marginLeft:'auto', color:'var(--accent)' }}>✓</span>}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-gh" style={{ flex:1 }} onClick={() => setStep(1)}>← Volver</button>
              <button className="btn btn-ac" style={{ flex:2 }}
                disabled={!position || saving}
                onClick={finish}>
                {saving ? 'Guardando...' : '¡Entrar a la app!'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
