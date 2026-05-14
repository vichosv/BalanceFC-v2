import { useState } from 'react';
import { useConvocatorias, createConvocatoria, respondConvocatoria, deleteConvocatoria } from '../hooks/useConvocatorias';
import { usePlayer } from '../hooks/usePlayer';

const FORMATS   = ['Libre','4v4','5v5','6v6','7v7','Triangular (6v6v6)'];
const POS_EMOJI = { GK:'🧤', DEF:'🛡️', MID:'⚙️', WNG:'⚡', FWD:'🎯' };

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long' });
}

function getMyStatus(conv, uid) {
  if (conv.confirmados?.some(p => p.uid === uid)) return 'confirmados';
  if (conv.maybe?.some(p => p.uid === uid))       return 'maybe';
  if (conv.rechazados?.some(p => p.uid === uid))  return 'rechazados';
  return null;
}

// Split confirmados into titulares + reserva
function splitTitulares(confirmados, max) {
  const sorted = [...(confirmados || [])].sort((a, b) => a.timestamp - b.timestamp);
  return {
    titulares: sorted.slice(0, max),
    reserva:   sorted.slice(max),
  };
}

export default function ConvPage({ ctx }) {
  const { user, isAdmin } = ctx;
  const { convocatorias, loading } = useConvocatorias();
  const { player } = usePlayer(user?.uid);

  const [showForm,   setShowForm]   = useState(false);
  const [expanded,   setExpanded]   = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    date: '', time: '20:00', place: '', format: '5v5', maxPlayers: 10,
  });

  async function handleCreate() {
    if (!form.date || !form.place) return;
    setSubmitting(true);
    await createConvocatoria({
      ...form,
      maxPlayers: parseInt(form.maxPlayers),
      createdBy:  user.uid,
      creatorNick: player?.nickname || 'Anon',
    });
    setForm({ date:'', time:'20:00', place:'', format:'5v5', maxPlayers:10 });
    setShowForm(false);
    setSubmitting(false);
  }

  async function respond(conv, response) {
    if (!player) return;
    await respondConvocatoria(conv.id, conv, player, response);
  }

  if (loading) return <div className="page" style={{ color:'var(--muted)' }}>Cargando...</div>;

  return (
    <div className="page">
      <div className="page-title">📋 Convocatoria</div>

      {/* ── Create button ── */}
      {!showForm ? (
        <button className="btn btn-ac btn-full" onClick={() => setShowForm(true)}>
          + Convocar partido
        </button>
      ) : (
        <div className="card" style={{ marginBottom:14 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>🗓️ Nuevo partido</div>

          <div className="grid-2" style={{ marginBottom:10 }}>
            <div>
              <label>Fecha</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label>Hora</label>
              <input type="time" value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginBottom:10 }}>
            <label>Lugar</label>
            <input placeholder="Cancha, dirección..." value={form.place}
              onChange={e => setForm(f => ({ ...f, place: e.target.value }))} />
          </div>

          <div className="grid-2" style={{ marginBottom:14 }}>
            <div>
              <label>Formato</label>
              <select value={form.format}
                onChange={e => setForm(f => ({ ...f, format: e.target.value }))}>
                {FORMATS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label>Máx. jugadores</label>
              <input type="number" min={2} max={30} value={form.maxPlayers}
                onChange={e => setForm(f => ({ ...f, maxPlayers: e.target.value }))} />
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-gh" style={{ flex:1 }} onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button className="btn btn-ac" style={{ flex:2 }}
              disabled={!form.date || !form.place || submitting}
              onClick={handleCreate}>
              {submitting ? 'Creando...' : 'Crear convocatoria'}
            </button>
          </div>
        </div>
      )}

      {/* ── Convocatoria list ── */}
      {convocatorias.length === 0 && !showForm && (
        <div style={{ textAlign:'center', padding:'48px 0', color:'var(--muted)' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>📭</div>
          <div>No hay partidos convocados</div>
        </div>
      )}

      {convocatorias.map(conv => {
        const myStatus = getMyStatus(conv, user?.uid);
        const { titulares, reserva } = splitTitulares(conv.confirmados, conv.maxPlayers);
        const isOpen = expanded === conv.id;
        const total  = (conv.confirmados?.length || 0);

        return (
          <div key={conv.id} className="card conv-card">

            {/* ── Header ── */}
            <div onClick={() => setExpanded(isOpen ? null : conv.id)}
              style={{ cursor:'pointer' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, textTransform:'capitalize' }}>
                    {formatDate(conv.date)}
                  </div>
                  <div style={{ color:'var(--muted)', fontSize:12, marginTop:2 }}>
                    🕐 {conv.time} · 📍 {conv.place}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span className="conv-badge">{conv.format}</span>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>
                    {total}/{conv.maxPlayers} ✅
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height:4, borderRadius:2, background:'var(--border2)', overflow:'hidden', marginBottom:8 }}>
                <div style={{
                  height:'100%', borderRadius:2, background:'var(--green)',
                  width:`${Math.min(100, (total / conv.maxPlayers) * 100)}%`,
                  transition:'width .4s'
                }} />
              </div>

              {/* Quick avatar row */}
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {titulares.map(p => (
                  <span key={p.uid} title={p.nickname}
                    style={{ fontSize:11, background:'rgba(0,230,118,.15)', border:'1px solid rgba(0,230,118,.3)',
                      borderRadius:6, padding:'2px 7px', color:'var(--green)' }}>
                    {POS_EMOJI[p.position]} {p.nickname}
                  </span>
                ))}
                {reserva.map(p => (
                  <span key={p.uid} title={`Reserva: ${p.nickname}`}
                    style={{ fontSize:11, background:'rgba(255,215,64,.1)', border:'1px solid rgba(255,215,64,.25)',
                      borderRadius:6, padding:'2px 7px', color:'var(--yellow)' }}>
                    {POS_EMOJI[p.position]} {p.nickname}
                  </span>
                ))}
                {(conv.maybe?.length > 0) && (
                  <span style={{ fontSize:11, color:'var(--muted)' }}>
                    +{conv.maybe.length} tal vez
                  </span>
                )}
              </div>
            </div>

            {/* ── Expanded detail ── */}
            {isOpen && (
              <div style={{ marginTop:14, borderTop:'1px solid var(--border)', paddingTop:14 }}>

                {/* Titulares */}
                {titulares.length > 0 && (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--green)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
                      ✅ Confirmados ({titulares.length})
                    </div>
                    {titulares.map((p, i) => (
                      <PlayerRow key={p.uid} player={p} index={i+1} />
                    ))}
                  </div>
                )}

                {/* Reserva */}
                {reserva.length > 0 && (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--yellow)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
                      🟡 Reserva ({reserva.length})
                    </div>
                    {reserva.map((p, i) => (
                      <PlayerRow key={p.uid} player={p} index={titulares.length + i + 1} isReserva />
                    ))}
                  </div>
                )}

                {/* Tal vez */}
                {conv.maybe?.length > 0 && (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
                      ❓ Tal vez ({conv.maybe.length})
                    </div>
                    {conv.maybe.map(p => (
                      <PlayerRow key={p.uid} player={p} />
                    ))}
                  </div>
                )}

                {/* Response buttons */}
                {player && (
                  <div style={{ display:'flex', gap:6, marginTop:12 }}>
                    {[
                      { key:'confirmados', label:'✅ Voy', color:'var(--green)' },
                      { key:'maybe',       label:'❓ Tal vez', color:'var(--yellow)' },
                      { key:'rechazados',  label:'❌ No puedo', color:'var(--red)' },
                    ].map(({ key, label, color }) => (
                      <button key={key} onClick={() => respond(conv, myStatus === key ? 'remove' : key)}
                        style={{
                          flex:1, padding:'8px 4px', borderRadius:8, border:'none', cursor:'pointer',
                          fontSize:12, fontWeight:700,
                          background: myStatus === key ? color : 'var(--surface2)',
                          color: myStatus === key ? 'var(--bg)' : color,
                          outline: myStatus === key ? 'none' : `1px solid ${color}40`,
                          transition:'all .15s',
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Admin: delete */}
                {isAdmin && (
                  <button onClick={() => {
                    if (window.confirm('¿Eliminar esta convocatoria?'))
                      deleteConvocatoria(conv.id);
                  }} style={{
                    width:'100%', marginTop:10, padding:'7px', borderRadius:8,
                    background:'rgba(255,82,82,.1)', border:'1px solid rgba(255,82,82,.3)',
                    color:'var(--red)', cursor:'pointer', fontSize:12, fontWeight:600,
                  }}>
                    🗑️ Eliminar convocatoria
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlayerRow({ player, index, isReserva }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0',
      borderBottom:'1px solid var(--border)', fontSize:13 }}>
      {index != null && (
        <span style={{ width:20, color:'var(--muted)', fontSize:11, textAlign:'right' }}>
          {index}.
        </span>
      )}
      <span>{POS_EMOJI[player.position]}</span>
      <span style={{ fontWeight:600 }}>{player.nickname}</span>
      {isReserva && (
        <span style={{ marginLeft:'auto', fontSize:10, color:'var(--yellow)',
          background:'rgba(255,215,64,.1)', border:'1px solid rgba(255,215,64,.25)',
          borderRadius:4, padding:'1px 6px' }}>
          reserva
        </span>
      )}
    </div>
  );
}
