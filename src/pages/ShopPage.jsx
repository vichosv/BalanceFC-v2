import { useState } from 'react';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import PlayerCard from '../components/PlayerCard';
import { CATEGORIES, addShopItem, setShopItem, deleteShopItem, DEFAULT_SHOP_ITEMS } from '../utils/shop';
import { useShopItems } from '../hooks/useShopItems';
import { useConvocatorias } from '../hooks/useConvocatorias';
import { useBets, placeBet } from '../hooks/useBets';

// Un item está "en Firestore" si tiene createdAt o updatedAt (default puro no los tiene)
const isFirestoreItem = item => !!(item.createdAt || item.updatedAt);

// Comprime una imagen a data URL (similar al photo de profile)
function compressImage(file, maxPx = 400, quality = 0.85) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      // PNG conserva transparencia (importante para stickers); JPEG es más liviano para fondos
      const isPng = file.type === 'image/png' || file.name?.endsWith('.png');
      resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality));
    };
    img.src = url;
  });
}

// ── Admin helpers ─────────────────────────────────────────────
function blankItem(category) {
  const base = { category, name:'', emoji:'⭐', price:5, desc:'' };
  if (category === 'accent')     return { ...base, color:'#00e5ff' };
  if (category === 'frame')      return { ...base, borderColor:'#ff6600', glowColor:'#ff3300' };
  if (category === 'pattern')    return { ...base, cssBackground:'' };
  if (category === 'background') return { ...base, color1:'#1a1a1e', color2:'#3a3a44', color3:'#22222a', angle:150 };
  return base; // sticker
}

function hexToRgba(hex, a) {
  const h = hex.replace('#','');
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function buildCustomItem(form) {
  const base = {
    category: form.category, name: form.name, emoji: form.emoji,
    price: Number(form.price) || 0, desc: form.desc,
  };
  if (form.category === 'accent')     return { ...base, color: form.color };
  if (form.category === 'sticker')    return { ...base, imageUrl: form.imageUrl || null };
  if (form.category === 'frame') {
    const bc = form.borderColor, gc = form.glowColor;
    return { ...base, borderColor: bc, glowColor: gc, cssBoxShadow:
      `0 0 0 2px ${bc}, 0 0 22px ${hexToRgba(gc, 0.75)}, 0 0 48px ${hexToRgba(gc, 0.35)}` };
  }
  if (form.category === 'pattern') {
    // Si subió imagen, usar como background-image. Si no, CSS manual.
    if (form.imageUrl) {
      return { ...base, imageUrl: form.imageUrl,
        cssBackground: `url(${form.imageUrl}) repeat`, };
    }
    return { ...base, cssBackground: form.cssBackground };
  }
  if (form.category === 'background') {
    // Imagen como fondo de carta, o degradado de colores
    if (form.imageUrl) {
      return { ...base, imageUrl: form.imageUrl,
        cssBackground: `url(${form.imageUrl}) center/cover no-repeat` };
    }
    return { ...base,
      color1: form.color1, color2: form.color2, color3: form.color3, angle: form.angle,
      cssBackground: `linear-gradient(${form.angle}deg, ${form.color1} 0%, ${form.color2} 45%, ${form.color3} 100%)` };
  }
  return base;
}

// Item → form fields (para editar). Si el item no tiene source values, usa defaults
function itemToForm(item) {
  const f = {
    editId: item.id,
    category: item.category,
    name: item.name || '',
    emoji: item.emoji || '⭐',
    price: item.price ?? 5,
    desc: item.desc || '',
    imageUrl: item.imageUrl || null,
  };
  if (item.category === 'accent')     return { ...f, color: item.color || '#00e5ff' };
  if (item.category === 'frame')      return { ...f, borderColor: item.borderColor || '#ff6600', glowColor: item.glowColor || '#ff3300' };
  if (item.category === 'pattern')    return { ...f, cssBackground: item.cssBackground || '' };
  if (item.category === 'background') return { ...f,
    color1: item.color1 || '#1a1a1e', color2: item.color2 || '#3a3a44',
    color3: item.color3 || '#22222a', angle: item.angle ?? 150 };
  return f;
}

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
  const { user, isAdmin, players = [] } = ctx;
  const player = players.find(p => p.uid === user?.uid);
  const [cat, setCat] = useState('accent');

  // shop preview modal
  const [preview, setPreview] = useState(null);
  // admin: new item modal
  const [adminForm, setAdminForm] = useState(null); // { ...item draft }

  // all items (defaults + Firestore)
  const allItems = useShopItems();

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
  const shopItems  = allItems.filter(i => i.category === cat);
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
      <div className="page-title">🛒 Tienda</div>

      {/* ── Saldo + recompensas + carta ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:14,
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:14, padding:'14px 16px', marginBottom:16,
      }}>
        {/* Col 1: saldo + recompensas */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:26 }}>🪙</span>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif",
              fontSize:38, fontWeight:900, color:'var(--accent)', lineHeight:1 }}>
              {coins}
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:2,
            fontSize:10, lineHeight:1.4, color:'var(--muted)', marginTop:8 }}>
            <div><b style={{ color:'var(--accent)' }}>+2</b> jugar · <b style={{ color:'var(--accent)' }}>+1</b> gol</div>
            <div><b style={{ color:'var(--accent)' }}>+1</b> victoria · <b style={{ color:'var(--accent)' }}>+1</b> MVP · <b style={{ color:'var(--accent)' }}>+1</b> arquero</div>
          </div>
        </div>
        {/* Col 2: mini carta */}
        <div style={{ width:78, flexShrink:0 }}>
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
        <>
          {/* Admin: agregar item */}
          {isAdmin && (
            <button onClick={() => setAdminForm(blankItem(cat))}
              style={{ width:'100%', padding:'10px', marginBottom:10,
                background:'rgba(0,229,255,.08)', border:'1.5px dashed var(--accent)',
                borderRadius:12, color:'var(--accent)', fontWeight:700, fontSize:13,
                cursor:'pointer' }}>
              + Agregar {CATEGORIES.find(c => c.id === cat)?.label?.split(' ')[1] || 'item'}
            </button>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {shopItems.map(item => {
            const owned    = isOwned(item);
            const active   = isEquipped(item);
            const canBuy   = !owned && coins >= item.price;
            const inFirestore = isFirestoreItem(item);

            return (
              <div key={item.id} style={{
                position:'relative',
                borderRadius:14, padding:'14px 12px',
                display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                textAlign:'center',
                background: active ? 'rgba(0,229,255,.08)' : 'var(--surface)',
                border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                opacity: (!owned && !canBuy) ? 0.55 : 1,
                transition:'all .15s',
              }}>
                {isAdmin && (
                  <div style={{ position:'absolute', top:6, right:6, display:'flex', gap:4 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAdminForm(itemToForm(item)); }}
                      title="Editar (admin)"
                      style={{ width:22, height:22,
                        background:'rgba(0,229,255,.15)', border:'none', borderRadius:'50%',
                        color:'var(--accent)', cursor:'pointer', fontSize:11, lineHeight:1,
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                      ✏️
                    </button>
                    {inFirestore && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const isOverride = DEFAULT_SHOP_ITEMS.some(d => d.id === item.id);
                          const msg = isOverride
                            ? `¿Revertir "${item.name}" al valor por defecto?`
                            : `¿Eliminar "${item.name}" de la tienda?`;
                          if (confirm(msg)) await deleteShopItem(item.id);
                        }}
                        title={DEFAULT_SHOP_ITEMS.some(d => d.id === item.id) ? 'Revertir a default' : 'Eliminar'}
                        style={{ width:22, height:22,
                          background:'rgba(255,82,82,.15)', border:'none', borderRadius:'50%',
                          color:'var(--red)', cursor:'pointer', fontSize:12, lineHeight:1,
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
                        ✕
                      </button>
                    )}
                  </div>
                )}
                <div style={{ width:42, height:42, display:'flex', alignItems:'center',
                  justifyContent:'center', filter: (!owned && !canBuy) ? 'grayscale(1)' : 'none' }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name}
                      style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} />
                  ) : (
                    <span style={{ fontSize:38, lineHeight:1 }}>{item.emoji}</span>
                  )}
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
        </>
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

      {/* ── Modal admin: agregar item ── */}
      {adminForm && (() => {
        const f = adminForm;
        const built = buildCustomItem(f);
        const simPlayer = { ...player, equipped: { ...equipped, [f.category]: '__preview__' } };
        // Inject preview item into items list via a temporary wrapper
        const inputStyle = { width:'100%', padding:'8px 10px', borderRadius:8,
          border:'1px solid var(--border)', background:'var(--surface2)',
          color:'var(--text)', fontSize:13 };
        const labelStyle = { fontSize:11, color:'var(--muted)', fontWeight:700,
          display:'block', marginBottom:4, marginTop:8 };

        async function save() {
          if (!f.name.trim()) { alert('Falta nombre'); return; }
          if (f.editId) await setShopItem(f.editId, built);  // crea o sobreescribe
          else          await addShopItem(built);             // auto-id nuevo
          setAdminForm(null);
        }

        return (
          <div onClick={() => setAdminForm(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.78)',
              display:'flex', alignItems:'center', justifyContent:'center',
              zIndex:9999, padding:20, overflow:'auto' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:'var(--surface)', borderRadius:18, padding:'20px',
                width:'100%', maxWidth:380, border:'1px solid var(--border)',
                maxHeight:'90vh', overflowY:'auto' }}>
              <div style={{ fontSize:15, fontWeight:800, marginBottom:12 }}>
                {f.editId ? '✏️ Editar' : '➕ Nuevo'} item — {CATEGORIES.find(c => c.id === f.category)?.label}
              </div>

              {/* Mini preview del efecto */}
              <div style={{ background:'var(--surface2)', borderRadius:12,
                padding:14, marginBottom:14, display:'flex', alignItems:'center',
                justifyContent:'center', gap:14, minHeight:88, position:'relative',
                overflow:'hidden',
                ...(f.category === 'background' ? {
                  background: `linear-gradient(${f.angle}deg, ${f.color1} 0%, ${f.color2} 45%, ${f.color3} 100%)`,
                } : {}),
                ...(f.category === 'frame' ? {
                  boxShadow: built.cssBoxShadow,
                  border:`1px solid ${f.borderColor}`,
                } : {}),
              }}>
                {f.category === 'pattern' && f.cssBackground && (
                  <div style={{ position:'absolute', inset:0, background:f.cssBackground }} />
                )}
                <div style={{ fontSize:38, lineHeight:1, position:'relative', zIndex:1 }}>{f.emoji}</div>
                <div style={{ position:'relative', zIndex:1 }}>
                  <div style={{ fontSize:14, fontWeight:800,
                    color: f.category === 'accent' ? f.color : 'var(--text)' }}>
                    {f.name || 'Sin nombre'}
                  </div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>{f.desc || 'Sin descripción'}</div>
                  <div style={{ fontSize:12, color:'var(--accent)', fontWeight:700, marginTop:2 }}>
                    🪙 {f.price}
                  </div>
                </div>
              </div>

              {/* Common fields */}
              <label style={labelStyle}>Nombre</label>
              <input style={inputStyle} value={f.name} maxLength={20}
                onChange={e => setAdminForm({ ...f, name:e.target.value })} placeholder="Ej: Galaxia" />

              <label style={labelStyle}>Emoji (icono en la tienda)</label>
              <input style={inputStyle} value={f.emoji} maxLength={4}
                onChange={e => setAdminForm({ ...f, emoji:e.target.value })} />

              <label style={labelStyle}>Descripción</label>
              <input style={inputStyle} value={f.desc} maxLength={50}
                onChange={e => setAdminForm({ ...f, desc:e.target.value })} placeholder="Breve descripción" />

              <label style={labelStyle}>Precio (🪙)</label>
              <input style={inputStyle} type="number" min={0} value={f.price}
                onChange={e => setAdminForm({ ...f, price:e.target.value })} />

              {/* Subida de imagen (sticker / pattern / background) */}
              {(f.category === 'sticker' || f.category === 'pattern' || f.category === 'background') && (
                <>
                  <label style={labelStyle}>
                    Imagen (PNG, JPG)
                    {f.category === 'sticker' && ' — usa PNG con transparencia'}
                  </label>
                  {f.imageUrl ? (
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:4 }}>
                      <div style={{
                        width:64, height:64, borderRadius:8,
                        background: f.category === 'sticker' ? 'var(--surface2)'
                          : f.category === 'pattern'  ? `url(${f.imageUrl}) repeat`
                          : `url(${f.imageUrl}) center/cover`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        border:'1px solid var(--border)', overflow:'hidden',
                      }}>
                        {f.category === 'sticker' && (
                          <img src={f.imageUrl} alt=""
                            style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} />
                        )}
                      </div>
                      <button
                        onClick={() => setAdminForm({ ...f, imageUrl:null })}
                        style={{ padding:'6px 12px', borderRadius:8, border:'1px solid var(--red)',
                          background:'rgba(255,82,82,.1)', color:'var(--red)',
                          fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        Quitar imagen
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const maxPx = f.category === 'background' ? 400
                                    : f.category === 'pattern'    ? 200
                                    : 160; // sticker
                        const dataUrl = await compressImage(file, maxPx, 0.9);
                        setAdminForm({ ...f, imageUrl: dataUrl });
                      }}
                      style={{ marginTop:4, fontSize:11, color:'var(--muted)' }}
                    />
                  )}
                </>
              )}

              {/* Category-specific */}
              {f.category === 'accent' && (
                <>
                  <label style={labelStyle}>Color</label>
                  <input type="color" value={f.color}
                    onChange={e => setAdminForm({ ...f, color:e.target.value })}
                    style={{ width:'100%', height:42, border:'none', borderRadius:8, cursor:'pointer' }} />
                </>
              )}

              {f.category === 'frame' && (
                <>
                  <label style={labelStyle}>Color del borde</label>
                  <input type="color" value={f.borderColor}
                    onChange={e => setAdminForm({ ...f, borderColor:e.target.value })}
                    style={{ width:'100%', height:42, border:'none', borderRadius:8, cursor:'pointer' }} />
                  <label style={labelStyle}>Color del resplandor</label>
                  <input type="color" value={f.glowColor}
                    onChange={e => setAdminForm({ ...f, glowColor:e.target.value })}
                    style={{ width:'100%', height:42, border:'none', borderRadius:8, cursor:'pointer' }} />
                </>
              )}

              {f.category === 'background' && !f.imageUrl && (
                <>
                  <div style={{ fontSize:10, color:'var(--muted)', marginTop:8 }}>
                    O usa un degradado de colores:
                  </div>
                  <label style={labelStyle}>Color 1 (esquina sup-izq)</label>
                  <input type="color" value={f.color1}
                    onChange={e => setAdminForm({ ...f, color1:e.target.value })}
                    style={{ width:'100%', height:38, border:'none', borderRadius:8 }} />
                  <label style={labelStyle}>Color 2 (centro)</label>
                  <input type="color" value={f.color2}
                    onChange={e => setAdminForm({ ...f, color2:e.target.value })}
                    style={{ width:'100%', height:38, border:'none', borderRadius:8 }} />
                  <label style={labelStyle}>Color 3 (esquina inf-der)</label>
                  <input type="color" value={f.color3}
                    onChange={e => setAdminForm({ ...f, color3:e.target.value })}
                    style={{ width:'100%', height:38, border:'none', borderRadius:8 }} />
                  <label style={labelStyle}>Ángulo del degradado: {f.angle}°</label>
                  <input type="range" min={0} max={360} value={f.angle}
                    onChange={e => setAdminForm({ ...f, angle:Number(e.target.value) })}
                    style={{ width:'100%' }} />
                  <div style={{ height:60, borderRadius:8, marginTop:6,
                    background:`linear-gradient(${f.angle}deg, ${f.color1} 0%, ${f.color2} 45%, ${f.color3} 100%)` }} />
                </>
              )}

              {f.category === 'pattern' && !f.imageUrl && (
                <>
                  <div style={{ fontSize:10, color:'var(--muted)', marginTop:8 }}>
                    O usa CSS personalizado (avanzado):
                  </div>
                  <label style={labelStyle}>CSS background</label>
                  <textarea style={{ ...inputStyle, fontFamily:'monospace', fontSize:11, minHeight:70 }}
                    value={f.cssBackground}
                    onChange={e => setAdminForm({ ...f, cssBackground:e.target.value })}
                    placeholder="repeating-linear-gradient(45deg, rgba(255,255,255,.1) 0, rgba(255,255,255,.1) 2px, transparent 2px, transparent 14px)" />
                  {f.cssBackground && (
                    <div style={{ height:60, borderRadius:8, marginTop:6,
                      background:`linear-gradient(150deg, #1a1a1e 0%, #3a3a44 45%, #22222a 100%)`,
                      position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', inset:0, background:f.cssBackground }} />
                    </div>
                  )}
                </>
              )}

              <div style={{ display:'flex', gap:10, marginTop:16 }}>
                <button onClick={() => setAdminForm(null)}
                  style={{ flex:1, padding:'10px', borderRadius:10,
                    border:'1px solid var(--border)', background:'var(--surface2)',
                    color:'var(--text)', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  Cancelar
                </button>
                <button onClick={save}
                  style={{ flex:2, padding:'10px', borderRadius:10, border:'none',
                    background:'var(--accent)', color:'#000', fontWeight:800,
                    fontSize:13, cursor:'pointer' }}>
                  {f.editId ? 'Guardar cambios' : 'Crear item'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
