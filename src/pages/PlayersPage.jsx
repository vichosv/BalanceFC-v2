import { useState, useRef } from 'react';
import PlayerCard from '../components/PlayerCard';
import '../components/PlayerCard.css';
import { overall, SK, uid } from '../utils/stats';
import { saveClub } from '../firebase/db';

const POSITIONS = {
  GK:  { id:'GK',  name:'Arquero',    emoji:'🧤' },
  DEF: { id:'DEF', name:'Defensor',   emoji:'🛡️' },
  MID: { id:'MID', name:'Mediocampo', emoji:'⚙️' },
  WNG: { id:'WNG', name:'Extremo',    emoji:'⚡' },
  FWD: { id:'FWD', name:'Delantero',  emoji:'🎯' },
};

const DEFAULT_STATS = { vel:50, tec:50, def:50, tir:50, sta:50, fis:50 };

export default function PlayersPage({ ctx }) {
  const { club, isAdmin } = ctx;
  const players = club?.players ?? [];

  const [editId,   setEditId]   = useState(null);
  const [addName,  setAddName]  = useState('');
  const [addPos,   setAddPos]   = useState('FWD');
  const [search,   setSearch]   = useState('');
  const [error,    setError]    = useState('');

  const sorted = [...players]
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => overall(b) - overall(a));

  // ── Add player ────────────────────────────────────────────
  async function addPlayer() {
    const name = addName.trim();
    if (!name) return;
    if (players.find(p => p.name.toLowerCase() === name.toLowerCase())) {
      setError('Ya existe ese nombre'); return;
    }
    const newPlayer = {
      id: uid(), name, position: addPos, emoji: '⚽',
      ...DEFAULT_STATS,
      history: { matches:0, wins:0, losses:0, draws:0, mvps:0, goals:0, assists:0 },
    };
    await saveClub({ players: [...players, newPlayer] });
    setAddName(''); setError('');
  }

  // ── Remove player ─────────────────────────────────────────
  async function removePlayer(id) {
    if (!window.confirm('¿Eliminar jugador?')) return;
    await saveClub({ players: players.filter(p => p.id !== id) });
    if (editId === id) setEditId(null);
  }

  // ── Update stat ───────────────────────────────────────────
  async function updateStat(id, key, val) {
    const updated = players.map(p => p.id === id ? { ...p, [key]: parseInt(val) } : p);
    await saveClub({ players: updated });
  }

  // ── Update position ───────────────────────────────────────
  async function updatePosition(id, pos) {
    const updated = players.map(p => p.id === id ? { ...p, position: pos } : p);
    await saveClub({ players: updated });
  }

  // ── Photo upload ──────────────────────────────────────────
  function triggerPhoto(id) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      const b64 = await resizeImage(file, 320);
      const updated = players.map(p => p.id === id ? { ...p, photo: b64 } : p);
      await saveClub({ players: updated });
    };
    inp.click();
  }

  async function removePhoto(id) {
    const updated = players.map(p => {
      if (p.id !== id) return p;
      const { photo, ...rest } = p; return rest;
    });
    await saveClub({ players: updated });
  }

  const editing = players.find(p => p.id === editId);

  return (
    <div className="page">
      <div className="page-title">👥 Jugadores</div>

      {/* ── Add player (admin) ── */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>+ Agregar jugador</div>
          <div className="grid-2" style={{ marginBottom: 10 }}>
            <div>
              <label>Nombre</label>
              <input
                value={addName}
                onChange={e => { setAddName(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && addPlayer()}
                placeholder="Nombre del jugador..."
                maxLength={20}
              />
            </div>
            <div>
              <label>Posición</label>
              <select value={addPos} onChange={e => setAddPos(e.target.value)}>
                {Object.values(POSITIONS).map(p => (
                  <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <div style={{ color:'var(--red)', fontSize:12, marginBottom:8 }}>⚠️ {error}</div>}
          <button className="btn btn-ac btn-full" onClick={addPlayer}>+ Agregar</button>
        </div>
      )}

      {/* ── Search ── */}
      <input
        placeholder="🔍 Buscar jugador..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      {/* ── Player grid ── */}
      {sorted.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 0', color:'var(--muted)' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>📋</div>
          <div>No hay jugadores aún</div>
        </div>
      )}

      <div className="players-grid">
        {sorted.map(p => (
          <div key={p.id} className="profile-slot">
            <PlayerCard player={p} onClick={() => setEditId(editId === p.id ? null : p.id)} />

            {/* ── Editor (admin) ── */}
            {isAdmin && editId === p.id && (
              <div className="card" style={{ borderColor:'var(--border2)', padding:14 }}>

                {/* Position */}
                <div style={{ marginBottom:12 }}>
                  <label>Posición</label>
                  <select value={p.position} onChange={e => updatePosition(p.id, e.target.value)}>
                    {Object.values(POSITIONS).map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.emoji} {pos.name}</option>
                    ))}
                  </select>
                </div>

                {/* Photo */}
                <div style={{ marginBottom:12 }}>
                  <label>Foto de carta</label>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                    {p.photo && (
                      <img src={p.photo} alt="foto"
                        style={{ width:44, height:44, borderRadius:8, objectFit:'cover', border:'2px solid var(--border2)' }} />
                    )}
                    <button className="btn btn-ac" style={{ fontSize:12, padding:'6px 10px' }}
                      onClick={() => triggerPhoto(p.id)}>
                      📸 {p.photo ? 'Cambiar' : 'Subir foto'}
                    </button>
                    {p.photo && (
                      <button onClick={() => removePhoto(p.id)}
                        style={{ background:'rgba(255,82,82,.18)', border:'1px solid rgba(255,82,82,.4)', borderRadius:6, color:'var(--red)', cursor:'pointer', padding:'6px 8px', fontSize:12 }}>
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats sliders */}
                {SK.map(s => (
                  <div key={s.key} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:12, fontWeight:600 }}>{s.emoji} {s.label}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:s.color }}>{p[s.key] ?? 50}</span>
                    </div>
                    <input type="range" min="10" max="100" step="1"
                      value={p[s.key] ?? 50}
                      onChange={e => updateStat(p.id, s.key, e.target.value)}
                      style={{ width:'100%', accentColor: s.color }}
                    />
                  </div>
                ))}

                {/* Delete */}
                <button
                  style={{ width:'100%', marginTop:4, background:'rgba(255,82,82,.12)', border:'1px solid rgba(255,82,82,.3)', borderRadius:8, color:'var(--red)', cursor:'pointer', padding:'8px', fontSize:13, fontWeight:600 }}
                  onClick={() => removePlayer(p.id)}>
                  🗑️ Eliminar jugador
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function resizeImage(file, maxW) {
  return new Promise(resolve => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', .72));
    };
    img.src = url;
  });
}
