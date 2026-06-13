import { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PlayerCard from '../components/PlayerCard';
import PlayerProfileSheet from '../components/PlayerProfileSheet';
import '../components/PlayerCard.css';
import { overall, SK, defaultStatsForPosition } from '../utils/stats';
import { seedDummyPlayers } from '../utils/seedPlayers';
import EmptyState from '../components/EmptyState';
import { MANUAL_LOGROS, TIER_COLOR } from '../utils/logros';

const POSITIONS = {
  GK:  { id:'GK',  name:'Arquero',    emoji:'🧤' },
  DEF: { id:'DEF', name:'Defensor',   emoji:'🛡️' },
  MID: { id:'MID', name:'Mediocampo', emoji:'⚙️' },
  WNG: { id:'WNG', name:'Extremo',    emoji:'⚡' },
  FWD: { id:'FWD', name:'Delantero',  emoji:'🎯' },
};

export default function PlayersPage({ ctx }) {
  const { players = [], isAdmin } = ctx;

  const [tab,           setTab]           = useState('vista');
  const [editId,        setEditId]        = useState(null);
  const [search,        setSearch]        = useState('');
  const [viewingPlayer, setViewingPlayer] = useState(null);

  const sorted = [...players]
    .filter(p => (p.nickname || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      tab === 'admin'
        ? (a.nickname || '').localeCompare(b.nickname || '')
        : overall(b) - overall(a)
    );

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

  async function toggleManualLogro(uid, current, logId) {
    const next = current.includes(logId)
      ? current.filter(id => id !== logId)
      : [...current, logId];
    await updateDoc(doc(db, 'players', uid), { manualLogros: next });
  }

  return (
    <div className="page">
      <div className="page-title">👥 Jugadores</div>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ color:'var(--muted)', fontSize:12 }}>
          {players.length} jugadores
          {isAdmin && <span style={{ marginLeft:6, color:'var(--accent)', fontWeight:700 }}>· Admin</span>}
        </div>
        {isAdmin && (
          <button className="btn btn-gh" style={{ fontSize:11, padding:'4px 10px' }}
            onClick={() => seedDummyPlayers()}>
            🧪 Cargar demo
          </button>
        )}
      </div>

      {/* Tabs (solo admin ve la de stats) */}
      {isAdmin && (
        <div style={{ display:'flex', gap:4, marginBottom:12, background:'var(--surface2)',
          borderRadius:10, padding:4 }}>
          {[{ id:'vista', label:'👥 Vista' }, { id:'admin', label:'⚙️ Stats' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex:1, padding:'7px', borderRadius:8, border:'none', cursor:'pointer',
                fontWeight:700, fontSize:13, transition:'all .15s',
                background: tab === t.id ? 'var(--surface)' : 'transparent',
                color:      tab === t.id ? 'var(--accent)'  : 'var(--muted)',
                boxShadow:  tab === t.id ? '0 1px 4px rgba(0,0,0,.3)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ═══════════ TAB: VISTA ═══════════ */}
      {tab === 'vista' && (
        <>
          <input placeholder="🔍 Buscar..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ marginBottom:10 }} />

          {sorted.length === 0 && (
            <EmptyState
              icon="👥"
              title="Sin jugadores"
              subtitle="Todavía no hay nadie registrado. Los jugadores aparecen acá cuando crean su perfil."
            />
          )}

          <div className="players-grid">
            {sorted.map(p => (
              <div key={p.uid} onClick={() => setViewingPlayer(p)} style={{ cursor:'pointer' }}>
                <PlayerCard player={p} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══════════ TAB: ADMIN STATS ═══════════ */}
      {tab === 'admin' && isAdmin && (
        <>
          <input placeholder="🔍 Buscar..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ marginBottom:10 }} />

          {/* Reset masivo por posición */}
          <button
            onClick={async () => {
              const ok1 = confirm(
                `Vas a PISAR los stats de TODOS los jugadores (${players.length}) ` +
                `con los defaults de su posición.\n\n` +
                `Se pierde toda la evolución acumulada por partidos.\n\n` +
                `¿Continuar?`
              );
              if (!ok1) return;
              const ok2 = confirm('¿Seguro? Esta acción NO se puede deshacer.');
              if (!ok2) return;
              try {
                await Promise.all(players.map(p =>
                  updateDoc(doc(db, 'players', p.uid), {
                    ...defaultStatsForPosition(p.position),
                    statHistory: [], // limpiamos la evolución vieja
                  })
                ));
                alert(`Listo. ${players.length} jugadores actualizados.`);
              } catch (e) {
                alert('Error: ' + (e.message || 'no se pudo actualizar'));
              }
            }}
            style={{ width:'100%', padding:'10px', marginBottom:14,
              background:'rgba(255,82,82,.08)', border:'1.5px dashed var(--red)',
              borderRadius:10, color:'var(--red)', fontWeight:700, fontSize:12,
              cursor:'pointer' }}>
            🔄 Resetear stats de TODOS según su posición
          </button>

          {sorted.map(p => (
            <div key={p.uid} className="card" style={{ marginBottom:10, padding:12 }}>
              {/* Header jugador */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                marginBottom: editId === p.uid ? 12 : 0, cursor:'pointer' }}
                onClick={() => setEditId(editId === p.uid ? null : p.uid)}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  {p.photo && (
                    <img src={p.photo} alt="" style={{ width:36, height:36, borderRadius:8,
                      objectFit:'cover', border:'2px solid var(--border2)' }} />
                  )}
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{p.nickname}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>
                      {POSITIONS[p.position]?.name} · OVR {overall(p)}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:12, color:'var(--muted)' }}>
                    {editId === p.uid ? '▲' : '▼'}
                  </span>
                  <button onClick={e => { e.stopPropagation(); removePlayer(p.uid); }}
                    style={{ background:'rgba(255,82,82,.12)', border:'1px solid rgba(255,82,82,.3)',
                      borderRadius:6, color:'var(--red)', cursor:'pointer',
                      padding:'4px 8px', fontSize:12 }}>
                    🗑️
                  </button>
                </div>
              </div>

              {/* Expandible */}
              {editId === p.uid && (
                <>
                  {/* Sliders */}
                  {SK.map(s => (
                    <div key={s.key} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                        <span style={{ fontSize:12, color:'var(--muted)' }}>{s.label}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:s.color }}>{p[s.key] ?? 50}</span>
                      </div>
                      <input type="range" min="10" max="100" step="1"
                        value={p[s.key] ?? 50}
                        onChange={e => updateStat(p.uid, s.key, e.target.value)}
                        style={{ width:'100%', accentColor:s.color }} />
                    </div>
                  ))}

                  {/* Logros manuales */}
                  <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)',
                      textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                      🏅 Logros manuales
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                      {MANUAL_LOGROS.map(l => {
                        const isOn = (p.manualLogros || []).includes(l.id);
                        const c    = TIER_COLOR[l.tier];
                        return (
                          <button key={l.id}
                            onClick={() => toggleManualLogro(p.uid, p.manualLogros || [], l.id)}
                            style={{
                              padding:'3px 8px', borderRadius:6,
                              border:`1px solid ${isOn ? c.border : 'var(--border2)'}`,
                              background: isOn ? c.bg : 'transparent',
                              color: isOn ? c.text : 'var(--muted)',
                              cursor:'pointer', fontSize:10, fontWeight:700,
                              transition:'all .15s',
                            }}>
                            {l.emoji} {l.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </>
      )}
      {/* ── Perfil público ── */}
      {viewingPlayer && (
        <PlayerProfileSheet
          player={viewingPlayer}
          onClose={() => setViewingPlayer(null)} />
      )}
    </div>
  );
}
