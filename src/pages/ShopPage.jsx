import { useState } from 'react';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import PlayerCard from '../components/PlayerCard';
import { SHOP_ITEMS, CATEGORIES } from '../utils/shop';

export default function ShopPage({ ctx }) {
  const { user, players = [] } = ctx;
  const player = players.find(p => p.uid === user?.uid);
  const [cat, setCat] = useState('accent');
  // preview modal
  const [preview, setPreview] = useState(null); // item being previewed

  if (!player) return <div className="page" style={{ color:'var(--muted)' }}>Cargando...</div>;

  const coins     = player.coins     || 0;
  const inventory = new Set(player.inventory || []);
  const equipped  = player.equipped  || {};

  const items = SHOP_ITEMS.filter(i => i.category === cat);

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

  // Carta simulada con el ítem del preview aplicado
  function previewPlayer(item) {
    const sim = { ...player, equipped: { ...equipped, [item.category]: item.id } };
    return sim;
  }

  return (
    <div className="page">
      <div className="page-title">🛍️ Tienda</div>

      {/* ── Saldo ── */}
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
            Ganas <b style={{ color:'var(--text)' }}>+2</b> por partido
            · <b style={{ color:'var(--text)' }}>+1</b> por cada gol
          </div>
        </div>
        <div style={{ width:72, flexShrink:0 }}>
          <PlayerCard player={player} />
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div style={{ display:'flex', gap:4, marginBottom:14,
        background:'var(--surface2)', borderRadius:10, padding:4 }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)}
            style={{ flex:1, padding:'7px 4px', borderRadius:8, border:'none',
              cursor:'pointer', fontWeight:700, fontSize:12, transition:'all .15s',
              background: cat === c.id ? 'var(--surface)' : 'transparent',
              color:      cat === c.id ? 'var(--accent)'  : 'var(--muted)',
              boxShadow:  cat === c.id ? '0 1px 4px rgba(0,0,0,.3)' : 'none' }}>
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize:11, color:'var(--muted)', marginBottom:12, textAlign:'center' }}>
        {CATEGORIES.find(c => c.id === cat)?.desc}
      </div>

      {/* ── Items grid ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {items.map(item => {
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
                  style={{
                    marginTop:4, padding:'6px 14px', borderRadius:8,
                    fontWeight:800, fontSize:12, cursor:'pointer', border:'none',
                    background: active ? 'var(--accent)' : 'var(--surface2)',
                    color:      active ? '#000' : 'var(--text)',
                    width:'100%',
                  }}>
                  {active ? '✓ Equipado' : 'Equipar'}
                </button>
              ) : (
                <button onClick={() => canBuy && setPreview({ item, mode:'buy' })}
                  disabled={!canBuy}
                  style={{
                    marginTop:4, padding:'6px 14px', borderRadius:8,
                    fontWeight:800, fontSize:12, border:'none', width:'100%',
                    cursor: canBuy ? 'pointer' : 'default',
                    background: canBuy ? 'rgba(0,229,255,.15)' : 'var(--surface2)',
                    color:      canBuy ? 'var(--accent)'       : 'var(--muted)',
                  }}>
                  🪙 {item.price}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modal de preview ── */}
      {preview && (() => {
        const { item, mode } = preview;
        const simPlayer = previewPlayer(item);
        const active    = isEquipped(item);
        return (
          <div
            onClick={() => setPreview(null)}
            style={{
              position:'fixed', inset:0, background:'rgba(0,0,0,.72)',
              display:'flex', alignItems:'center', justifyContent:'center',
              zIndex:9999, padding:24,
            }}>
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background:'var(--surface)', borderRadius:20,
                padding:'28px 24px', width:'100%', maxWidth:340,
                border:'1px solid var(--border)',
                display:'flex', flexDirection:'column', alignItems:'center', gap:16,
              }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--muted)',
                textTransform:'uppercase', letterSpacing:1 }}>
                Vista previa
              </div>

              {/* Carta con el ítem aplicado */}
              <div style={{ width:170 }}>
                <PlayerCard player={simPlayer} />
              </div>

              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:800 }}>
                  {item.emoji} {item.name}
                </div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>
                  {item.desc}
                </div>
                {mode === 'buy' && (
                  <div style={{ fontSize:13, color:'var(--accent)', fontWeight:700, marginTop:6 }}>
                    🪙 {item.price} goles
                  </div>
                )}
              </div>

              <div style={{ display:'flex', gap:10, width:'100%' }}>
                <button
                  onClick={() => setPreview(null)}
                  style={{ flex:1, padding:'10px 0', borderRadius:10, border:'1px solid var(--border)',
                    background:'var(--surface2)', color:'var(--text)', fontWeight:700,
                    fontSize:13, cursor:'pointer' }}>
                  Cancelar
                </button>
                {mode === 'buy' ? (
                  <button
                    onClick={() => buyItem(item)}
                    style={{ flex:2, padding:'10px 0', borderRadius:10, border:'none',
                      background:'var(--accent)', color:'#000', fontWeight:800,
                      fontSize:13, cursor:'pointer' }}>
                    Comprar 🪙 {item.price}
                  </button>
                ) : (
                  <button
                    onClick={() => equipItem(item)}
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
    </div>
  );
}
