import { useState } from 'react';
import { useConvocatorias, createConvocatoria, joinConvocatoria, leaveConvocatoria, deleteConvocatoria } from '../hooks/useConvocatorias';
import { usePlayer } from '../hooks/usePlayer';
import EmptyState from '../components/EmptyState';
import { isInscriptionOpen, fmtInscriptionOpen } from '../utils/inscription';

const FORMATS   = ['Libre','4v4','5v5','6v6','7v7','Triangular (6v6v6)'];
const POS_EMOJI = { GK:'🧤', DEF:'🛡️', MID:'⚙️', WNG:'⚡', FWD:'🎯' };

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long' });
}

function splitTitulares(confirmados, max) {
  const sorted = [...(confirmados || [])].sort((a, b) => a.timestamp - b.timestamp);
  return { titulares: sorted.slice(0, max), reserva: sorted.slice(max) };
}

const POS_TEXT = { GK:'GK', DEF:'DEF', MID:'MID', WNG:'WNG', FWD:'FWD' };

function shareConvocatoria(conv, titulares, reserva) {
  const dateStr = formatDate(conv.date);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const lines = [
    'BALANCEFC - Partido convocado',
    '',
    'Fecha:   ' + cap(dateStr),
    'Hora:    ' + conv.time,
    'Lugar:   ' + conv.place,
    'Formato: ' + conv.format,
    '',
  ];

  if (titulares.length > 0) {
    lines.push('Confirmados (' + titulares.length + '/' + conv.maxPlayers + '):');
    titulares.forEach((p, i) => {
      lines.push('  ' + (i + 1) + '. ' + p.nickname);
    });
  } else {
    lines.push('Sin confirmados aun.');
  }

  if (reserva.length > 0) {
    lines.push('');
    lines.push('Reserva (' + reserva.length + '):');
    reserva.forEach((p, i) => {
      lines.push('  ' + (i + 1) + '. ' + p.nickname);
    });
  }

  lines.push('');
  lines.push('Sumate en: ' + window.location.origin);

  const text = encodeURIComponent(lines.join('\n'));
  window.open('https://wa.me/?text=' + text, '_blank');
}

export default function ConvPage({ ctx }) {
  const { user, isAdmin } = ctx;
  const { convocatorias, loading } = useConvocatorias();
  const { player } = usePlayer(user?.uid);

  const [showForm,   setShowForm]   = useState(false);
  const [expanded,   setExpanded]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ date:'', time:'20:00', place:'', format:'6v6', maxPlayers:12 });

  async function handleCreate() {
    if (!form.date || !form.place) return;
    setSubmitting(true);
    await createConvocatoria({ ...form, maxPlayers: parseInt(form.maxPlayers), createdBy: user.uid, creatorNick: player?.nickname || '' });
    setForm({ date:'', time:'20:00', place:'', format:'5v5', maxPlayers:10 });
    setShowForm(false);
    setSubmitting(false);
  }

  if (loading) return <div className="page" style={{ color:'var(--muted)' }}>Cargando...</div>;

  return (
    <div className="page">
      <div className="page-title">📋 Convocatoria</div>

      {/* ── Create button / form ── */}
      {!showForm ? (
        <button className="btn btn-ac btn-full" onClick={() => setShowForm(true)}>
          + Convocar partido
        </button>
      ) : (
        <div className="card" style={{ marginBottom:14 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>🗓️ Nuevo partido</div>
          <div className="grid-2" style={{ marginBottom:10 }}>
            <div><label>Fecha</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div><label>Hora</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            <label>Lugar</label>
            <input placeholder="Cancha, dirección..." value={form.place}
              onChange={e => setForm(f => ({ ...f, place: e.target.value }))} />
          </div>
          <div className="grid-2" style={{ marginBottom:14 }}>
            <div><label>Formato</label>
              <select value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}>
                {FORMATS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div><label>Máx. jugadores</label>
              <input type="number" min={2} max={30} value={form.maxPlayers}
                onChange={e => setForm(f => ({ ...f, maxPlayers: e.target.value }))} />
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-gh" style={{ flex:1 }} onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn btn-ac" style={{ flex:2 }}
              disabled={!form.date || !form.place || submitting} onClick={handleCreate}>
              {submitting ? 'Creando...' : 'Crear convocatoria'}
            </button>
          </div>
        </div>
      )}

      {/* ── Empty ── */}
      {convocatorias.length === 0 && !showForm && (
        <EmptyState
          icon="📋"
          title="Sin convocatorias"
          subtitle="No hay ningún partido convocado. Cuando se cree uno, vas a poder anotarte acá."
        />
      )}

      {/* ── List ── */}
      {convocatorias.map(conv => {
        const { titulares, reserva } = splitTitulares(conv.confirmados, conv.maxPlayers);
        const isIn   = conv.confirmados?.some(p => p.uid === user?.uid);
        const isOpen = expanded === conv.id;
        const total  = conv.confirmados?.length || 0;
        const inscOpen = isInscriptionOpen(conv);
        const inscOpenLabel = fmtInscriptionOpen(conv);

        return (
          <div key={conv.id} className="card conv-card">

            {/* ── Header (tap to expand) ── */}
            <div onClick={() => setExpanded(isOpen ? null : conv.id)} style={{ cursor:'pointer' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, textTransform:'capitalize' }}>
                    {formatDate(conv.date)}
                  </div>
                  <div style={{ color:'var(--muted)', fontSize:12, marginTop:2 }}>
                    🕐 {conv.time} &nbsp;·&nbsp; 📍 {conv.place}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span className="conv-badge">{conv.format}</span>
                  <div style={{ fontSize:11, color: total >= conv.maxPlayers ? 'var(--yellow)' : 'var(--muted)', marginTop:4 }}>
                    {total}/{conv.maxPlayers} ✅
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height:4, borderRadius:2, background:'var(--border2)', overflow:'hidden', marginBottom:8 }}>
                <div style={{
                  height:'100%', borderRadius:2,
                  background: total >= conv.maxPlayers ? 'var(--yellow)' : 'var(--green)',
                  width:`${Math.min(100,(total/conv.maxPlayers)*100)}%`, transition:'width .4s'
                }} />
              </div>

              {/* Avatar row */}
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {titulares.map(p => (
                  <span key={p.uid} style={{ fontSize:11, background:'rgba(0,230,118,.12)',
                    border:'1px solid rgba(0,230,118,.25)', borderRadius:6, padding:'2px 7px', color:'var(--green)' }}>
                    {POS_EMOJI[p.position]} {p.nickname}
                  </span>
                ))}
                {reserva.map(p => (
                  <span key={p.uid} style={{ fontSize:11, background:'rgba(255,215,64,.08)',
                    border:'1px solid rgba(255,215,64,.2)', borderRadius:6, padding:'2px 7px', color:'var(--yellow)' }}>
                    {POS_EMOJI[p.position]} {p.nickname}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Expanded ── */}
            {isOpen && (
              <div style={{ marginTop:14, borderTop:'1px solid var(--border)', paddingTop:14 }}>

                {/* Titulares */}
                {titulares.length > 0 && (
                  <PlayerSection title={`✅ Confirmados (${titulares.length})`} color="var(--green)"
                    players={titulares} isAdmin={isAdmin}
                    onRemove={uid => leaveConvocatoria(conv.id, conv.confirmados, uid)} />
                )}

                {/* Reserva */}
                {reserva.length > 0 && (
                  <PlayerSection title={`🟡 Reserva (${reserva.length})`} color="var(--yellow)"
                    players={reserva} isAdmin={isAdmin}
                    onRemove={uid => leaveConvocatoria(conv.id, conv.confirmados, uid)} showReservaBadge />
                )}

                {/* Action button */}
                {player && (
                  <div style={{ marginTop:12 }}>
                    {!inscOpen && !isIn ? (
                      <div style={{ padding:'12px 14px', borderRadius:10,
                        background:'rgba(255,193,7,.08)', border:'1px solid rgba(255,193,7,.3)',
                        textAlign:'center' }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#ffc107',
                          textTransform:'capitalize' }}>
                          ⏰ Inscripción abre el {inscOpenLabel}
                        </div>
                        <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>
                          Volvé ese día para confirmar tu lugar
                        </div>
                      </div>
                    ) : !isIn ? (
                      <button className="btn btn-ac btn-full"
                        onClick={() => joinConvocatoria(conv.id, conv.confirmados || [], player, conv)}>
                        ✅ Voy
                      </button>
                    ) : (
                      <button onClick={() => leaveConvocatoria(conv.id, conv.confirmados, user.uid)}
                        style={{ width:'100%', padding:'10px', borderRadius:8, border:'1px solid rgba(255,82,82,.3)',
                          background:'rgba(255,82,82,.1)', color:'var(--red)', cursor:'pointer',
                          fontSize:13, fontWeight:600 }}>
                        Salirse del partido
                      </button>
                    )}
                  </div>
                )}

                {/* Share WhatsApp */}
                <button
                  onClick={() => shareConvocatoria(conv, titulares, reserva)}
                  style={{ width:'100%', marginTop:8, padding:'10px', borderRadius:8,
                    border:'1px solid rgba(37,211,102,.3)', background:'rgba(37,211,102,.1)',
                    color:'#25d366', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                  📲 Compartir por WhatsApp
                </button>

                {/* Admin: delete */}
                {isAdmin && (
                  <button onClick={() => window.confirm('¿Eliminar esta convocatoria?') && deleteConvocatoria(conv.id)}
                    style={{ width:'100%', marginTop:8, padding:'7px', borderRadius:8,
                      background:'transparent', border:'1px solid rgba(255,82,82,.2)',
                      color:'var(--red)', cursor:'pointer', fontSize:12, fontWeight:600 }}>
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

function PlayerSection({ title, color, players, isAdmin, onRemove, showReservaBadge }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:11, fontWeight:700, color, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
        {title}
      </div>
      {players.map((p, i) => (
        <div key={p.uid} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0',
          borderBottom:'1px solid var(--border)', fontSize:13 }}>
          <span style={{ width:20, color:'var(--muted)', fontSize:11, textAlign:'right' }}>{i+1}.</span>
          <span>{POS_EMOJI[p.position]}</span>
          <span style={{ fontWeight:600, flex:1 }}>{p.nickname}</span>
          {showReservaBadge && (
            <span style={{ fontSize:10, color:'var(--yellow)', background:'rgba(255,215,64,.1)',
              border:'1px solid rgba(255,215,64,.2)', borderRadius:4, padding:'1px 6px' }}>reserva</span>
          )}
          {isAdmin && (
            <button onClick={() => onRemove(p.uid)}
              style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:14, padding:'0 4px' }}>
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
