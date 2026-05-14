import { useState, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { usePlayer } from '../hooks/usePlayer';
import { useMatches } from '../hooks/useMatches';
import PlayerCard from '../components/PlayerCard';
import { SK, overall } from '../utils/stats';
import HexRadar from '../components/HexRadar';
import { computeLogros, TIER_COLOR } from '../utils/logros';

const POSITIONS = [
  { id:'GK',  name:'Arquero',    emoji:'🧤' },
  { id:'DEF', name:'Defensor',   emoji:'🛡️' },
  { id:'MID', name:'Mediocampo', emoji:'⚙️' },
  { id:'WNG', name:'Extremo',    emoji:'⚡' },
  { id:'FWD', name:'Delantero',  emoji:'🎯' },
];

async function compressImage(file, maxPx = 500) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.src = url;
  });
}

export default function ProfilePage({ ctx }) {
  const { user, isAdmin, logout } = ctx;
  const { player, loading } = usePlayer(user?.uid);
  const { matches } = useMatches();

  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState(null);
  const [saving,   setSaving]   = useState(false);
  const fileRef = useRef();

  function startEdit() {
    setForm({ nickname: player.nickname, position: player.position, photo: player.photo || null });
    setEditing(true);
  }

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setForm(f => ({ ...f, photo: compressed }));
  }

  async function saveProfile() {
    if (!form.nickname.trim()) return;
    setSaving(true);
    await updateDoc(doc(db, 'players', user.uid), {
      nickname: form.nickname.trim(),
      position: form.position,
      photo:    form.photo || null,
    });
    setEditing(false);
    setSaving(false);
  }

  if (loading) return <div className="page" style={{ color:'var(--muted)' }}>Cargando...</div>;
  if (!player)  return <div className="page" style={{ color:'var(--muted)' }}>Sin perfil</div>;

  const displayPlayer = editing ? { ...player, ...form } : player;
  const pj   = player.history?.matches || 0;
  const wins  = player.history?.wins   || 0;
  const mvps  = player.history?.mvps   || 0;
  const goals = player.history?.goals  || 0;
  const wr    = pj ? Math.round(wins / pj * 100) : 0;

  return (
    <div className="page">
      <div className="page-title">👤 Mi perfil</div>

      {/* ── Carta ── */}
      <div style={{ maxWidth:190, margin:'0 auto 20px' }}>
        <PlayerCard player={displayPlayer} />
      </div>

      {/* ── Badge admin ── */}
      {isAdmin && (
        <div style={{ textAlign:'center', marginBottom:14 }}>
          <span style={{ background:'var(--accent)', color:'var(--bg)', borderRadius:6,
            padding:'3px 12px', fontSize:12, fontWeight:700, letterSpacing:.5 }}>
            ⚡ Admin
          </span>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="card" style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
          textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Atributos</div>

        {/* Radar hexagonal */}
        <div style={{ display:'flex', justifyContent:'center', margin:'0 auto 4px' }}>
          <HexRadar player={displayPlayer} size={200} />
        </div>

        {/* Valores numéricos */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, marginBottom:8 }}>
          {SK.map(s => (
            <div key={s.key} style={{ textAlign:'center', padding:'4px 0' }}>
              <div style={{ fontSize:15, fontWeight:900, color:s.color, lineHeight:1 }}>
                {displayPlayer[s.key] || 50}
              </div>
              <div style={{ fontSize:9, color:'var(--muted)', fontWeight:700,
                letterSpacing:.5, textTransform:'uppercase', marginTop:1 }}>
                {s.label.slice(0,3)}
              </div>
            </div>
          ))}
        </div>

        {/* Resumen numérico */}
        <div style={{ display:'flex', justifyContent:'space-around', marginTop:10,
          borderTop:'1px solid var(--border)', paddingTop:10 }}>
          {[
            { val: overall(player), lbl:'OVR' },
            { val: pj,              lbl:'PJ'  },
            { val: wins,            lbl:'V'   },
            { val: goals,           lbl:'GOL' },
            { val: mvps,            lbl:'MVP' },
            { val: wr + '%',        lbl:'WR'  },
          ].map(({ val, lbl }) => (
            <div key={lbl} style={{ textAlign:'center' }}>
              <div style={{ fontSize:18, fontWeight:900 }}>{val}</div>
              <div style={{ fontSize:9, color:'var(--muted)', letterSpacing:.8, fontWeight:700 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Logros ── */}
      {(() => {
        const mvpCount = matches.filter(m => {
          if (!m.votes || !Object.keys(m.votes).length) return false;
          if (m.createdAt && Date.now() - m.createdAt < 86400000) return false;
          const counts = {};
          Object.values(m.votes).forEach(v => { if (v.mvp) counts[v.mvp] = (counts[v.mvp]||0)+1; });
          return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] === player.uid;
        }).length;
        const { unlocked, locked } = computeLogros(player, { mvpCount });
        return (
          <div className="card" style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              marginBottom:12 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
                textTransform:'uppercase', letterSpacing:1 }}>Logros</span>
              <span style={{ fontSize:11, color:'var(--accent)', fontWeight:700 }}>
                {unlocked.length}/{unlocked.length + locked.length}
              </span>
            </div>
            <LogrosGrid unlocked={unlocked} locked={locked} />
          </div>
        );
      })()}

      {/* ── Editar ── */}
      {!editing ? (
        <button className="btn btn-gh btn-full" onClick={startEdit}>✏️ Editar perfil</button>
      ) : (
        <div className="card" style={{ marginBottom:12 }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:14 }}>Editar perfil</div>

          {/* Foto */}
          <div style={{ marginBottom:14, textAlign:'center' }}>
            <input type="file" ref={fileRef} accept="image/*"
              style={{ display:'none' }} onChange={handlePhoto} />
            {form.photo ? (
              <div style={{ display:'inline-block', position:'relative' }}>
                <img src={form.photo} alt="" style={{ width:84, height:84, borderRadius:'50%',
                  objectFit:'cover', border:'2.5px solid var(--accent)' }} />
                <button onClick={() => setForm(f => ({ ...f, photo: null }))}
                  style={{ position:'absolute', top:-4, right:-4, width:22, height:22,
                    background:'var(--red)', border:'none', borderRadius:'50%',
                    color:'#fff', cursor:'pointer', fontSize:12,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              </div>
            ) : (
              <button className="btn btn-gh" style={{ fontSize:12 }}
                onClick={() => fileRef.current.click()}>
                + Foto de perfil
              </button>
            )}
            {form.photo && (
              <div style={{ marginTop:8 }}>
                <button className="btn btn-gh" style={{ fontSize:11, padding:'6px 14px' }}
                  onClick={() => fileRef.current.click()}>Cambiar foto</button>
              </div>
            )}
          </div>

          {/* Nickname */}
          <div style={{ marginBottom:12 }}>
            <label>Nickname</label>
            <input maxLength={16} value={form.nickname}
              onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} />
          </div>

          {/* Posición */}
          <div style={{ marginBottom:16 }}>
            <label>Posición</label>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:6 }}>
              {POSITIONS.map(p => (
                <button key={p.id} onClick={() => setForm(f => ({ ...f, position: p.id }))}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                    borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600, textAlign:'left',
                    border: `1.5px solid ${form.position === p.id ? 'var(--accent)' : 'var(--border2)'}`,
                    background: form.position === p.id ? 'rgba(0,229,255,.1)' : 'var(--surface2)',
                    color:'var(--text)', transition:'all .15s' }}>
                  <span style={{ fontSize:18 }}>{p.emoji}</span>
                  <span>{p.name}</span>
                  {form.position === p.id && (
                    <span style={{ marginLeft:'auto', color:'var(--accent)' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-gh" style={{ flex:1 }}
              onClick={() => setEditing(false)}>Cancelar</button>
            <button className="btn btn-ac" style={{ flex:2 }}
              disabled={!form.nickname.trim() || saving} onClick={saveProfile}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* ── Cerrar sesión ── */}
      <button className="btn btn-gh btn-full"
        style={{ marginTop:4, color:'var(--red)', borderColor:'rgba(255,82,82,.3)' }}
        onClick={logout}>
        Cerrar sesión
      </button>
    </div>
  );
}

// ── LogrosGrid ─────────────────────────────────────────────────
function LogrosGrid({ unlocked, locked }) {
  const all = [
    ...unlocked.map(l => ({ ...l, _on: true })),
    ...locked.map(l =>   ({ ...l, _on: false })),
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {all.map(l => {
        const c = TIER_COLOR[l.tier];
        return (
          <div key={l.id} style={{
            display:'flex', alignItems:'center', gap:12,
            padding:'10px 12px', borderRadius:12,
            background: l._on ? c.bg : 'rgba(255,255,255,.03)',
            border: `1px solid ${l._on ? c.border : 'rgba(255,255,255,.08)'}`,
            opacity: l._on ? 1 : 0.42,
          }}>
            {/* Icono estilo Steam */}
            <div style={{
              width:46, height:46, borderRadius:10, flexShrink:0,
              background: l._on ? `rgba(0,0,0,.35)` : 'rgba(255,255,255,.04)',
              border: `1.5px solid ${l._on ? c.border : 'rgba(255,255,255,.1)'}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:26, filter: l._on ? 'none' : 'grayscale(1) brightness(.5)',
              boxShadow: l._on ? `0 0 14px ${c.border}55` : 'none',
            }}>
              {l._on ? l.emoji : '🔒'}
            </div>
            {/* Texto */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:800, lineHeight:1.2, marginBottom:2,
                color: l._on ? c.text : 'var(--muted)' }}>
                {l.name}
              </div>
              <div style={{ fontSize:10, color:'var(--muted)', lineHeight:1.35 }}>
                {l.desc}
              </div>
            </div>
            {/* Badge tier */}
            {l._on && (
              <div style={{
                fontSize:8, fontWeight:800, color:c.text,
                textTransform:'uppercase', letterSpacing:.8,
                background: c.bg, border:`1px solid ${c.border}`,
                borderRadius:5, padding:'2px 6px', flexShrink:0,
              }}>{l.tier}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
