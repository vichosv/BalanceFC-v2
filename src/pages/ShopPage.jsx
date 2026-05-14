import { useState } from 'react';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import PlayerCard from '../components/PlayerCard';
import { SHOP_ITEMS, CATEGORIES } from '../utils/shop';
import { useConvocatorias } from '../hooks/useConvocatorias';
import { useBets, placeBet } from '../hooks/useBets';

// ── Bet constants ─────────────────────────────────────────────
const BET_TYPES = [
  { id:'team_win', emoji:'🏆', label:'Mi equipo gana',   desc:'Tu equipo termina ganando el partido' },
  { id:'i_score',  emoji:'⚽', label:'Yo meto un gol',   desc:'Marcas al menos 1 gol en el partido'  },
  { id:'big_win',  emoji:'💥', label:'Ganamos por +3',   desc:'Tu equipo gana con 3 o más goles de diferencia' },
];
const BET_AMOUNTS = [1, 2, 3, 5];
const BET_STATUS  = {
  pending: { bg:'rgba(255,193,7,.12)', color:'#ffc107', label:'⏳ Pendiente' },
  won:     { bg:'rgba(0,230,118,.15)', color:'#00e676', label:'✅ Ganada'    },
  lost:    { bg:'rgba(255,82,82,.12)', color:'#ff5252', label:'❌ Perdida'   },
};
const BET_LABEL = { team_win:'Mi equipo gana', i_score:'Yo meto un gol', big_win:'Ganamos por +3' };

// ── All tabs ──────────────────────────────────────────────────
const ALL_TABS = [
  ...CATEGORIES,
  { id:'apuestas', label:'🎰 Apostar', desc:'Apuesta tus monedas al resultado del partido' },
];

export default function ShopPage({ ctx }) {
  const { user, players = [] } = ctx;
  const player = players.find(p => p.uid === user?.uid);
  const [cat, setCat] = useState('accent');

  // shop preview modal
  const [preview, setPreview] = useState(null);

  // bets
  const { convocatorias } = useConvocatorias();
  const { bets }          = useBets(user?.uid);
  const [betAmounts, setBetAmounts] = useState({ team_win:1, i_score:1, big_win:1 });
  const [betConfirm, setBetConfirm] = useState(null);
  const [placing,    setPlacing]    = useState(null);

  if (!player) return <div className="page" style={{ color:'var(--muted)' }}>Cargando...</div>;

  const coins     = player.coins     || 0;
  const inventory = new Set(player.inventory || []);
  const equipped  = player.equipped  || {};

  // ── Shop helpers ──────────────────────────────────────────
  const shopItems  = SHOP_ITEMS.filter(i => i.category === cat);
  const isOwned    = item => item.price === 0 || inventory.has(item.id);
  const isEquipped = item => equipped[item.category] === item.id;

  async function buyItem(item) {
    if (coins < item.price) return;
    await updateDoc(doc(db, 'players', user.uid), {
      coins:     increment(-item.price),
      inventory: arrayUnion(item.id),
    });
    setPreview(null);
  }

  async function equipItem(item) {
    const next = isEquipped(item) ? null : item.id;
    await updateDoc(doc(db, 'players', user.uid), {
      [`equipped.${item.category}`]: next,
    });
    setPreview(null);
  }

  function previewPlayer(item) {
    return { ...player, equipped: { ...equipped, [item.category]: item.id } };
  }

  // ── Bet helpers ───────────────────────────────────────────
  const conv    = convocatorias[0] || null;
  const matchTs = conv?.date && conv?.time
    ? new Date(`${conv.date}T${conv.time}`).getTime() : null;
  const betsOpen  = !!matchTs && matchTs > Date.now();
  const pending   = bets.filter(b => b.status === 'pending');
  const resolved  = bets.filter(b => b.status !== 'pending').slice(0, 10);

  function fmtDate(date, time) {
    if (!date) return '';
    const d = new Date(`${date}T${time || '00:00'}`);
    return d.toLocaleDateString('es-CL', { weekday:'short', day:'numeric', month:'short' })
      + (time ? ` · ${time}` : '');
  }

  async function handleBet() {
    if (!betConfirm) return;
    const { type, amount } = betConfirm;
    if (coins < amount) return;
    setPlacing(type);
    try { await placeBet(user.uid, type, amount); }
    finally { setPlacing(null); setBetConfirm(null); }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="page-title">🎨 Personalización</div>

      {/* ── Saldo + mini carta ── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:14, padding:'12px 18px', marginBottom:16,
      }}>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
            fontSize:32, fontWeight:900, color:'var(--accent)', lineHeight:1 }}>
            🪙 {coins}
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
            <b style={{ color:'var(--text)' }}>+2</b> por partido
            · <b style={{ color:'var(--text)' }}>+1</b> por gol
          </div>
        </div>
        <div style={{ width:72, flexShrink:0 }}>
          <PlayerCard player={player} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:3, marginBottom:14, overflowX:'auto',
        background:'var(--surface2)', borderRadius:10, padding:4 }}>
        {ALL_TABS.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)}
            style={{ flex:'0 0 auto', padding:'7px 10px', borderRadius:8, border:'none',
              cursor:'pointer', fontWeight:700, fontSize:11, transition:'all .15s', whiteSpace:'nowrap',
              background: cat === c.id ? 'var(--surface)' : 'transparent',
              color:      cat === c.id ? 'var(--accent)'  : 'var(--muted)',
              boxShadow:  cat === c.id ? '0 1px 4px rgba(0,0,0,.3)' : 'none' }}>
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize:11, color:'var(--muted)', marginBottom:12, textAlign:'center' }}>
        {ALL_TABS.find(c => c.id === cat)?.desc}
      </div>

      {/* ══ APUESTAS TAB ══ */}
      {cat === 'apuestas' ? (
        <div>
          {/* Sin partido */}
          {!conv ? (
            <div className="card" style={{ textAlign:'center', color:'var(--muted)', padding:'28px 16px' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
              <div style={{ fontWeight:700 }}>No hay partido próximo</div>
              <div style={{ fontSize:12, marginTop:4 }}>
                Las apuestas se abren cuando hay convocatoria
              </div>
            </div>
          ) : (
            <>
              {/* Info partido */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                background:'var(--surface2)', borderRadius:12, padding:'10px 16px', marginBottom:14 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:13 }}>{conv.title || 'Próximo partido'}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                    {fmtDate(conv.date, conv.time)}
                  </div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20,
                  background: betsOpen ? 'rgba(0,230,118,.15)' : 'rgba(255,82,82,.12)',
                  color:      betsOpen ? '#00e676'             : '#ff5252' }}>
                  {betsOpen ? '🟢 Abiertas' : '🔴 Cerradas'}
                </span>
              </div>

              {/* Tipos de apuesta */}
              {betsOpen && (
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                  {BET_TYPES.map(bt => {
                    const mine   = pending.filter(b => b.type === bt.id);
                    const amt    = betAmounts[bt.id];
                    const canBet = coins >= amt;
                    return (
                      <div key={bt.id} style={{ background:'var(--surface)', border:'1px solid var(--border)',
                        borderRadius:14, padding:'14px 16px' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
                          <div style={{ fontSize:30, lineHeight:1 }}>{bt.emoji}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:800, fontSize:14 }}>{bt.label}</div>
                            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{bt.desc}</div>
                            {mine.length > 0 && (
                              <div style={{ fontSize:11, color:'#ffc107', marginTop:4 }}>
                                Ya apostaste: {mine.map(b => `🪙${b.amount}`).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ display:'flex', gap:4 }}>
                            {BET_AMOUNTS.map(a => (
                              <button key={a}
                                onClick={() => setBetAmounts(p => ({ ...p, [bt.id]:a }))}
                                style={{ width:34, height:34, borderRadius:8, border:'none',
                                  cursor:'pointer', fontWeight:800, fontSize:13, transition:'all .12s',
                                  background: amt === a ? 'var(--accent)' : 'var(--surface2)',
                                  color:      amt === a ? '#000'          : 'var(--muted)' }}>
                                {a}
                              </button>
                            ))}
                          </div>
                          <button disabled={!canBet || placing === bt.id}
                            onClick={() => setBetConfirm({ type:bt.id, amount:amt })}
                            style={{ flex:1, height:34, borderRadius:8, border:'none',
                              cursor: canBet ? 'pointer' : 'default', fontWeight:800, fontSize:11,
                              background: canBet ? 'rgba(0,229,255,.15)' : 'var(--surface2)',
                              color:      canBet ? 'var(--accent)'       : 'var(--muted)' }}>
                            {placing === bt.id ? '...' : `Apostar 🪙${amt} → 🪙${amt*2}`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pendientes cerradas */}
              {!betsOpen && pending.length > 0 && (
                <div className="card" style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
                    textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
                    Tus apuestas activas
                  </div>
                  {pending.map(b => (
                    <div key={b.id} style={{ display:'flex', justifyContent:'space-between',
                      alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{BET_LABEL[b.type]}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:12, color:'var(--accent)', fontWeight:700 }}>
                          🪙{b.amount} → 🪙{b.amount * 2}
                        </span>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
                          background: BET_STATUS.pending.bg, color: BET_STATUS.pending.color, fontWeight:700 }}>
                          {BET_STATUS.pending.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Historial */}
          {resolved.length > 0 && (
            <div className="card">
              <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
                textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
                Historial
              </div>
              {resolved.map(b => {
                const st = BET_STATUS[b.status] || BET_STATUS.pending;
                return (
                  <div key={b.id} style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
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
        </div>
      ) : (
        /* ══ SHOP TAB ══ */
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {shopItems.map(item => {
            const owned  = isOwned(item);
            const active = isEquipped(item);
            const canBuy = !owned && coins >= item.price;

            return (
              <div key={item.id} style={{
                borderRadius:14, padding:'14px 12px',
                display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                textAlign:'center',
                background: active ? 'rgba(0,229,255,.08)' : 'var(--surface)',
                border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                opacity: (!owned && !canBuy) ? 0.55 : 1,
                transition:'all .15s',
              }}>
                <div style={{ fontSize:38, lineHeight:1, filter: (!owned && !canBuy) ? 'grayscale(1)' : 'none' }}>
                  {item.emoji}
                </div>
                <div style={{ fontSize:13, fontWeight:800,
                  color: active ? 'var(--accent)' : 'var(--text)' }}>
                  {item.name}
                </div>
                <div style={{ fontSize:10, color:'var(--muted)', lineHeight:1.35 }}>
                  {item.desc}
                </div>
                {owned ? (
                  <button onClick={() => setPreview({ item, mode:'equip' })}
                    style={{ marginTop:4, padding:'6px 14px', borderRadius:8,
                      fontWeight:800, fontSize:12, cursor:'pointer', border:'none', width:'100%',
                      background: active ? 'var(--accent)' : 'var(--surface2)',
                      color:      active ? '#000'          : 'var(--text)' }}>
                    {active ? '✓ Equipado' : 'Equipar'}
                  </button>
                ) : (
                  <button onClick={() => canBuy && setPreview({ item, mode:'buy' })}
                    disabled={!canBuy}
                    style={{ marginTop:4, padding:'6px 14px', borderRadius:8,
                      fontWeight:800, fontSize:12, border:'none', width:'100%',
                      cursor: canBuy ? 'pointer' : 'default',
                      background: canBuy ? 'rgba(0,229,255,.15)' : 'var(--surface2)',
                      color:      canBuy ? 'var(--accent)'       : 'var(--muted)' }}>
                    🪙 {item.price}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal preview tienda ── */}
      {preview && (() => {
        const { item, mode } = preview;
        const simPlayer = previewPlayer(item);
        const active    = isEquipped(item);
        return (
          <div onClick={() => setPreview(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)',
              display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:24 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:'var(--surface)', borderRadius:20, padding:'28px 24px',
                width:'100%', maxWidth:340, border:'1px solid var(--border)',
                display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--muted)',
                textTransform:'uppercase', letterSpacing:1 }}>Vista previa</div>
              <div style={{ width:170 }}>
                <PlayerCard player={simPlayer} />
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:800 }}>{item.emoji} {item.name}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{item.desc}</div>
                {mode === 'buy' && (
                  <div style={{ fontSize:13, color:'var(--accent)', fontWeight:700, marginTop:6 }}>
                    🪙 {item.price} goles
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:10, width:'100%' }}>
                <button onClick={() => setPreview(null)}
                  style={{ flex:1, padding:'10px 0', borderRadius:10,
                    border:'1px solid var(--border)', background:'var(--surface2)',
                    color:'var(--text)', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  Cancelar
                </button>
                {mode === 'buy' ? (
                  <button onClick={() => buyItem(item)}
                    style={{ flex:2, padding:'10px 0', borderRadius:10, border:'none',
                      background:'var(--accent)', color:'#000', fontWeight:800, fontSize:13, cursor:'pointer' }}>
                    Comprar 🪙 {item.price}
                  </button>
                ) : (
                  <button onClick={() => equipItem(item)}
                    style={{ flex:2, padding:'10px 0', borderRadius:10, border:'none',
                      background: active ? 'rgba(255,82,82,.2)' : 'var(--accent)',
                      color: active ? 'var(--red)' : '#000',
                      fontWeight:800, fontSize:13, cursor:'pointer' }}>
                    {active ? 'Desequipar' : 'Equipar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal confirmar apuesta ── */}
      {betConfirm && (() => {
        const bt = BET_TYPES.find(b => b.id === betConfirm.type);
        return (
          <div onClick={() => setBetConfirm(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)',
              display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:24 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:'var(--surface)', borderRadius:20, padding:'28px 24px',
                width:'100%', maxWidth:320, border:'1px solid var(--border)',
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
                  🪙 {betConfirm.amount}
                </div>
                <div style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>
                  Si ganas: <b style={{ color:'#00e676' }}>🪙 {betConfirm.amount * 2}</b>
                </div>
              </div>
              <div style={{ display:'flex', gap:10, width:'100%' }}>
                <button onClick={() => setBetConfirm(null)}
                  style={{ flex:1, padding:'10px 0', borderRadius:10,
                    border:'1px solid var(--border)', background:'var(--surface2)',
                    color:'var(--text)', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleBet} disabled={!!placing}
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
