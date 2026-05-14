import { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PlayerCard from '../components/PlayerCard';
import '../components/PlayerCard.css';
import { overall, SK } from '../utils/stats';
import { seedDummyPlayers } from '../utils/seedPlayers';

const POSITIONS = {
  GK:  { id:'GK',  name:'Arquero',    emoji:'🧤' },
  DEF: { id:'DEF', name:'Defensor',   emoji:'🛡️' },
  MID: { id:'MID', name:'Mediocampo', emoji:'⚙️' },
  WNG: { id:'WNG', name:'Extremo',    emoji:'⚡' },
  FWD: { id:'FWD', name:'Delantero',  emoji:'🎯' },
};

export default function PlayersPage({ ctx }) {
  const { players = [], isAdmin } = ctx;

  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');

  const sorted = [...players]
    .filter(p => (p.nickname || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => overall(b) - overall(a));

  async function updateStat(uid, key, val) {
    await updateDoc(doc(db, 'players', uid), { [key]: parseInt(val) });
  }
  async function updatePosition(uid, pos) {
    await updateDoc(doc(db, 'players', uid), { position: pos });
  }
  async function removePlayer(uid) {
    if (!window.confirm('¿Eliminar jugador?')) return;
    await deleteDoc(doc(db, 'players', uid));
    if (editId === uid) setEditId(null);
  }
  async function uploadPhoto(uid) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      const b64 = await resizeImage(file, 320);
      await updateDoc(doc(db, 'players', uid), { photo: b64 });
    };
    inp.click();
  }
  async function removePhoto(uid) {
    await updateDoc(doc(db, 'players', uid), { photo: null });
  }

  return (
    <div className="page">
      <div className="page-title">👥 Jugadores</div>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ color:'var(--muted)', fontSize:12 }}>
          {players.length} jugador{players.length !== 1 ? 'es' : ''} registrado{players.length !== 1 ? 's' : ''}
          {isAdmin && <span style={{ marginLeft:6, color:'var(--accent)', fontWeight:700 }}>· Admin</span>}
        </div>
        {isAdmin && (
          <button className="btn btn-gh" style={{ fontSize:11, padding:'4px 10px' }}
            onClick={() => seedDummyPlayers()}>
            🧪 Cargar demo
          </button>
        )}
      </div>

      <input placeholder="🔍 Buscar jugador..." value={search}
        onChange={e => setSearch(e.target.value)} style={{ marginBottom:12 }} />

      {sorted.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 0', color:'var(--muted)' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>📋</div>
          <div>No hay jugadores aún</div>
        </div>
      )}

      <div className="players-grid">
        {sorted.map(p => (
          <div key={p.uid}>
            {/* Card con overlays admin */}
            <div style={{ position:'relative' }}>
              <PlayerCard player={p}
                onClick={isAdmin ? () => setEditId(editId === p.uid ? null : p.uid) : undefined} />

              {/* Admin overlays */}
              {isAdmin && (
                <>
                  {/* Trash top-right */}
                  <button onClick={() => removePlayer(p.uid)}
                    style={{ position:'absolute', top:8, right:8, zIndex:10,
                      width:28, height:28, borderRadius:8,
                      background:'rgba(0,0,0,.55)', border:'1px solid rgba(255,82,82,.4)',
                      color:'var(--red)', cursor:'pointer', fontSize:14,
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                    🗑️
                  </button>
                  {/* Photo top-left */}
                  <button onClick={() => p.photo ? removePhoto(p.uid) : uploadPhoto(p.uid)}
                    title={p.photo ? 'Quitar foto' : 'Subir foto'}
                    style={{ position:'absolute', top:8, left:8, zIndex:10,
                      width:28, height:28, borderRadius:8,
                      background:'rgba(0,0,0,.55)', border:'1px solid rgba(255,255,255,.2)',
                      color:'#fff', cursor:'pointer', fontSize:14,
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {p.photo ? '✕' : '📸'}
                  </button>
                </>
              )}
            </div>

            {/* Stat editor — se abre al tocar la carta */}
            {isAdmin && editId === p.uid && (
              <div className="card" style={{ marginTop:6, borderColor:'var(--border2)', padding:12 }}>
                {/* Position */}
                <div style={{ marginBottom:10 }}>
                  <label>Posición</label>
                  <select value={p.position} onChange={e => updatePosition(p.uid, e.target.value)}>
                    {Object.values(POSITIONS).map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.emoji} {pos.name}</option>
                    ))}
                  </select>
                </div>

                {/* Photo upload (if no photo yet) */}
                {!p.photo && (
                  <button className="btn btn-gh" style={{ width:'100%', fontSize:12, marginBottom:10 }}
                    onClick={() => uploadPhoto(p.uid)}>
                    📸 Subir foto de carta
                  </button>
                )}

                {/* Stats sliders */}
                {SK.map(s => (
                  <div key={s.key} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                      <span style={{ fontSize:11, color:'var(--muted)' }}>{s.label}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:s.color }}>{p[s.key] ?? 50}</span>
                    </div>
                    <input type="range" min="10" max="100" step="1"
                      value={p[s.key] ?? 50}
                      onChange={e => updateStat(p.uid, s.key, e.target.value)}
                      style={{ width:'100%', accentColor:s.color }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

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
