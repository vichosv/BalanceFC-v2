import { useState } from 'react';
import { useConvocatorias } from '../hooks/useConvocatorias';
import { useBets, placeBet } from '../hooks/useBets';

const BET_TYPES = [
  {
    id:    'team_win',
    emoji: '🏆',
    label: 'Mi equipo gana',
    desc:  'Tu equipo termina ganando el partido',
  },
  {
    id:    'i_score',
    emoji: '⚽',
    label: 'Yo meto un gol',
    desc:  'Marcas al menos 1 gol en el partido',
  },
  {
    id:    'big_win',
    emoji: '💥',
    label: 'Ganamos por +3',
    desc:  'Tu equipo gana con 3 o más goles de diferencia',
  },
];

const AMOUNTS = [1, 2, 3, 5];

const STATUS_STYLE = {
  pending: { bg:'rgba(255,193,7,.12)', color:'#ffc107',  label:'⏳ Pendiente' },
  won:     { bg:'rgba(0,230,118,.15)', color:'#00e676',  label:'✅ Ganada'   },
  lost:    { bg:'rgba(255,82,82,.12)', color:'#ff5252',  label:'❌ Perdida'  },
};

const BET_LABEL = { team_win:'Mi equipo gana', i_score:'Yo meto un gol', big_win:'Ganamos por +3' };

export default function BetPage({ ctx }) {
  const { user, players = [] } = ctx;
  const player = players.find(p => p.uid === user?.uid);
  const { convocatorias } = useConvocatorias();
  const { bets } = useBets(user?.uid);

  const [amounts,  setAmounts]  = useState({ team_win:1, i_score:1, big_win:1 });
  const [placing,  setPlacing]  = useState(null); // type being placed
  const [confirm,  setConfirm]  = useState(null); // { type, amount }

  if (!player) return <div className="page" style={{ color:'var(--muted)' }}>Cargando...</div>;

  const coins    = player.coins || 0;
  const conv     = convocatorias[0] || null;
  const now      = Date.now();
  const matchTs  = conv?.date && conv?.time
    ? new Date(`${conv.date}T${conv.time}`).getTime()
    : null;
  const isOpen   = !!matchTs && matchTs > now;

  // pending bets this player already placed (current cycle)
  const pending  = bets.filter(b => b.status === 'pending');
  const resolved = bets.filter(b => b.status !== 'pending').slice(0, 10);

  async function handlePlace() {
    if (!confirm) return;
    const { type, amount } = confirm;
    if (coins < amount) return;
    setPlacing(type);
    try {
      await placeBet(user.uid, type, amount);
    } finally {
      setPlacing(null);
      setConfirm(null);
    }
  }

  // Format date nicely
  function fmtDate(date, time) {
    if (!date) return '';
    const d = new Date(`${date}T${time || '00:00'}`);
    return d.toLocaleDateString('es-CL', { weekday:'short', day:'numeric', month:'short' })
      + (time ? ` · ${time}` : '');
  }

  return (
    <div className="page">
      <div className="page-title">🎰 Apuestas</div>

      {/* ── Saldo ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:12,
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:14, padding:'12px 18px', marginBottom:16,
      }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
          fontSize:34, fontWeight:900, color:'var(--accent)', lineHeight:1 }}>
          🪙 {coins}
        </div>
        <div style={{ fontSize:11, color:'var(--muted)' }}>
          Apuestas ganadoras<br />devuelven el <b style={{ color:'var(--text)' }}>doble</b>
        </div>
      </div>

      {/* ── Partido próximo ── */}
      {!conv ? (
        <div className="card" style={{ textAlign:'center', color:'var(--muted)',
          padding:'28px 16px', marginBottom:16 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
          <div style={{ fontWeight:700 }}>No hay partido próximo</div>
          <div style={{ fontSize:12, marginTop:4 }}>
            Las apuestas se abren cuando se publica una convocatoria
          </div>
        </div>
      ) : (
        <>
          {/* Info del partido */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            background:'var(--surface2)', borderRadius:12,
            padding:'10px 16px', marginBottom:14,
          }}>
            <div>
              <div style={{ fontWeight:700, fontSize:13 }}>
                {conv.title || 'Próximo partido'}
              </div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                {fmtDate(conv.date, conv.time)}
              </div>
            </div>
            <span style={{
              fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20,
              background: isOpen ? 'rgba(0,230,118,.15)' : 'rgba(255,82,82,.12)',
              color:      isOpen ? '#00e676'             : '#ff5252',
            }}>
              {isOpen ? '🟢 Abiertas' : '🔴 Cerradas'}
            </span>
          </div>

          {/* ── Tipos de apuesta ── */}
          {isOpen && (
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
              {BET_TYPES.map(bt => {
                const alreadyBet = pending.filter(b => b.type === bt.id);
                const amt        = amounts[bt.id];
                const canBet     = coins >= amt;

                return (
                  <div key={bt.id} style={{
                    background:'var(--surface)', border:'1px solid var(--border)',
                    borderRadius:14, padding:'14px 16px',
                  }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
                      <div style={{ fontSize:30, lineHeight:1 }}>{bt.emoji}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800, fontSize:14 }}>{bt.label}</div>
                        <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{bt.desc}</div>
                        {alreadyBet.length > 0 && (
                          <div style={{ fontSize:11, color:'#ffc107', marginTop:4 }}>
                            Ya apostaste: {alreadyBet.map(b => `🪙${b.amount}`).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selector de monto + botón */}
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ display:'flex', gap:4 }}>
                        {AMOUNTS.map(a => (
                          <button key={a} onClick={() => setAmounts(prev => ({ ...prev, [bt.id]:a }))}
                            style={{
                              width:34, height:34, borderRadius:8, border:'none',
                              cursor:'pointer', fontWeight:800, fontSize:13,
                              background: amt === a ? 'var(--accent)' : 'var(--surface2)',
                              color:      amt === a ? '#000'          : 'var(--muted)',
                              transition:'all .12s',
                            }}>
                            {a}
                          </button>
                        ))}
                      </div>
                      <button
                        disabled={!canBet || placing === bt.id}
                        onClick={() => setConfirm({ type: bt.id, amount: amt })}
                        style={{
                          flex:1, height:34, borderRadius:8, border:'none',
                          cursor: canBet ? 'pointer' : 'default',
                          fontWeight:800, fontSize:12,
                          background: canBet ? 'rgba(0,229,255,.15)' : 'var(--surface2)',
                          color:      canBet ? 'var(--accent)'       : 'var(--muted)',
                          transition:'all .12s',
                        }}>
                        {placing === bt.id ? 'Apostando...' : `Apostar 🪙${amt} → ganar 🪙${amt*2}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Apuestas pendientes (si cerradas) */}
          {!isOpen && pending.length > 0 && (
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
                textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
                Tus apuestas activas
              </div>
              {pending.map(b => (
                <div key={b.id} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'8px 0', borderBottom:'1px solid var(--border)',
                }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>
                    {BET_LABEL[b.type]}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:12, color:'var(--accent)', fontWeight:700 }}>
                      🪙{b.amount} → 🪙{b.amount * 2}
                    </span>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
                      background: STATUS_STYLE.pending.bg,
                      color: STATUS_STYLE.pending.color, fontWeight:700 }}>
                      {STATUS_STYLE.pending.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Historial de apuestas resueltas ── */}
      {resolved.length > 0 && (
        <div className="card" style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
            textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
            Historial
          </div>
          {resolved.map(b => {
            const st = STATUS_STYLE[b.status] || STATUS_STYLE.pending;
            return (
              <div key={b.id} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'8px 0', borderBottom:'1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{BET_LABEL[b.type]}</div>
                  <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>
                    {new Date(b.createdAt).toLocaleDateString('es-CL')}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:12, fontWeight:700,
                    color: b.status === 'won' ? '#00e676' : 'var(--muted)' }}>
                    {b.status === 'won' ? `+🪙${b.amount * 2}` : `-🪙${b.amount}`}
                  </span>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
                    background: st.bg, color: st.color, fontWeight:700 }}>
                    {st.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal de confirmación ── */}
      {confirm && (() => {
        const bt = BET_TYPES.find(b => b.id === confirm.type);
        return (
          <div onClick={() => setConfirm(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)',
              display:'flex', alignItems:'center', justifyContent:'center',
              zIndex:9999, padding:24 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:'var(--surface)', borderRadius:20,
                padding:'28px 24px', width:'100%', maxWidth:320,
                border:'1px solid var(--border)',
                display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>

              <div style={{ fontSize:48, lineHeight:1 }}>{bt.emoji}</div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:800 }}>{bt.label}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{bt.desc}</div>
              </div>

              <div style={{ background:'var(--surface2)', borderRadius:12,
                padding:'14px 24px', textAlign:'center', width:'100%' }}>
                <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>Apuestas</div>
                <div style={{ fontSize:28, fontWeight:900, color:'var(--accent)' }}>
                  🪙 {confirm.amount}
                </div>
                <div style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>
                  Si ganas: <b style={{ color:'#00e676' }}>🪙 {confirm.amount * 2}</b>
                </div>
              </div>

              <div style={{ display:'flex', gap:10, width:'100%' }}>
                <button onClick={() => setConfirm(null)}
                  style={{ flex:1, padding:'10px 0', borderRadius:10,
                    border:'1px solid var(--border)', background:'var(--surface2)',
                    color:'var(--text)', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handlePlace}
                  disabled={!!placing}
                  style={{ flex:2, padding:'10px 0', borderRadius:10, border:'none',
                    background:'var(--accent)', color:'#000',
                    fontWeight:800, fontSize:13, cursor:'pointer' }}>
                  {placing ? 'Apostando...' : '¡Apostar!'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
