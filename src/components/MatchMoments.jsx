import { useState } from 'react';
import { useMoments, addMoment, deleteMoment } from '../hooks/useMoments';
import { useToast } from './ToastProvider';

const MOMENT_TYPES = [
  { id:'golazo',  emoji:'🎯', label:'Golazo',  color:'#00e676' },
  { id:'atajada', emoji:'🧤', label:'Atajada', color:'#448aff' },
  { id:'errado',  emoji:'😬', label:'Errado',  color:'#ff9100' },
  { id:'blooper', emoji:'🤡', label:'Blooper', color:'#c47eff' },
];
const TYPE = Object.fromEntries(MOMENT_TYPES.map(t => [t.id, t]));

function fmt(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
// Parsea "mm:ss" o "ss" → segundos
function parseTime(str) {
  const t = str.trim();
  if (!t) return null;
  if (t.includes(':')) {
    const [m, s] = t.split(':').map(n => parseInt(n, 10));
    if (isNaN(m) || isNaN(s)) return null;
    return m * 60 + s;
  }
  const n = parseInt(t, 10);
  return isNaN(n) ? null : n;
}

// Construye URL de YouTube con timestamp
function videoAtTime(url, seconds) {
  if (!url) return url;
  const isYT = /youtu\.?be/.test(url);
  if (!isYT) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}t=${seconds}s`;
}

export default function MatchMoments({ match, userId, isAdmin }) {
  const moments = useMoments(match.id);
  const toast = useToast();
  const [open, setOpen]   = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm]   = useState({ type:'golazo', time:'', desc:'' });

  if (!match.videoUrl) return null; // solo con video

  async function save() {
    const secs = parseTime(form.time);
    if (secs == null) { toast.error('Tiempo inválido (usá mm:ss)'); return; }
    if (!form.desc.trim()) { toast.error('Falta la descripción'); return; }
    setAdding(true);
    try {
      const me = [...(match.teamA||[]), ...(match.teamB||[]), ...(match.teamC||[])]
        .find(p => p.uid === userId);
      await addMoment({
        matchId:  match.id,
        uid:      userId,
        nickname: me?.nickname || 'Anónimo',
        type:     form.type,
        time:     secs,
        desc:     form.desc.trim(),
      });
      setForm({ type:'golazo', time:'', desc:'' });
      toast.success('Momento marcado', { icon:'🎬' });
    } catch (e) {
      toast.error('No se pudo guardar el momento');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div style={{ borderTop:'1px solid var(--border)' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:'100%', padding:'9px 12px', background:'transparent',
          border:'none', cursor:'pointer', display:'flex', alignItems:'center',
          justifyContent:'space-between', color:'var(--text)' }}>
        <span style={{ fontSize:12, fontWeight:700 }}>
          🎬 Momentos {moments.length > 0 && (
            <span style={{ color:'var(--accent)' }}>· {moments.length}</span>
          )}
        </span>
        <span style={{ color:'var(--muted)', fontSize:12 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding:'0 12px 12px' }}>
          {/* Lista */}
          {moments.length === 0 ? (
            <div style={{ fontSize:11, color:'var(--muted)', padding:'4px 0 10px' }}>
              Sin momentos aún. Marcá el primero 👇
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
              {moments.map(mo => {
                const t = TYPE[mo.type] || TYPE.golazo;
                return (
                  <div key={mo.id} style={{ display:'flex', alignItems:'center', gap:8,
                    padding:'7px 10px', borderRadius:8, background:'var(--surface2)',
                    border:`1px solid ${t.color}33` }}>
                    <span style={{ fontSize:16 }}>{t.emoji}</span>
                    <a href={videoAtTime(match.videoUrl, mo.time)} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                        fontSize:14, color:t.color, textDecoration:'none', flexShrink:0,
                        background:'rgba(0,0,0,.3)', padding:'1px 6px', borderRadius:4 }}>
                      ▶ {fmt(mo.time)}
                    </a>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.3,
                        overflow:'hidden', textOverflow:'ellipsis' }}>
                        {mo.desc}
                      </div>
                      <div style={{ fontSize:9, color:'var(--muted)' }}>{mo.nickname}</div>
                    </div>
                    {(mo.uid === userId || isAdmin) && (
                      <button onClick={() => deleteMoment(mo.id)} title="Borrar"
                        style={{ background:'none', border:'none', color:'var(--red)',
                          cursor:'pointer', fontSize:13, flexShrink:0 }}>✕</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Form agregar */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, alignItems:'center' }}>
            {MOMENT_TYPES.map(t => (
              <button key={t.id} onClick={() => setForm(f => ({ ...f, type:t.id }))}
                style={{ padding:'5px 9px', borderRadius:8, cursor:'pointer', fontSize:11,
                  fontWeight:700,
                  border:`1.5px solid ${form.type === t.id ? t.color : 'var(--border2)'}`,
                  background: form.type === t.id ? `${t.color}22` : 'var(--surface2)',
                  color: form.type === t.id ? t.color : 'var(--muted)' }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:6, marginTop:8 }}>
            <input value={form.time} placeholder="mm:ss"
              onChange={e => setForm(f => ({ ...f, time:e.target.value }))}
              style={{ width:70, flexShrink:0, textAlign:'center' }} />
            <input value={form.desc} placeholder="Qué pasó..." maxLength={80}
              onChange={e => setForm(f => ({ ...f, desc:e.target.value }))}
              style={{ flex:1 }} />
            <button className="btn btn-ac" disabled={adding}
              style={{ padding:'8px 14px', fontSize:13 }} onClick={save}>
              {adding ? '...' : '+'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
