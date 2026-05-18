import { overall, tier, SK } from '../utils/stats';
import { useShopItems } from '../hooks/useShopItems';

const POSITIONS = {
  GK:  { short:'GK',  name:'Arquero',    emoji:'🧤' },
  DEF: { short:'DEF', name:'Defensor',   emoji:'🛡️' },
  MID: { short:'MID', name:'Mediocampo', emoji:'⚙️' },
  WNG: { short:'WNG', name:'Extremo',    emoji:'⚡' },
  FWD: { short:'FWD', name:'Delantero',  emoji:'🎯' },
};

// Símbolos por tier (basados en OVR)
const TIER_SYMBOLS = {
  iron:     '⚙️',
  bronze:   '🥉',
  silver:   '🥈',
  gold:     '🥇',
  emerald:  '🟢',
  sapphire: '🔷',
  ruby:     '♦️',
  diamond:  '💎',
  legend:   '👑',
};

function Radar({ p, size = 120 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const keys = SK.map(s => s.key);
  const points = keys.map((k, i) => {
    const angle = (i / keys.length) * 2 * Math.PI - Math.PI / 2;
    const val = (p[k] || 50) / 100;
    return [cx + r * val * Math.cos(angle), cy + r * val * Math.sin(angle)];
  });
  const grid = keys.map((_, i) => {
    const angle = (i / keys.length) * 2 * Math.PI - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
  const poly = points.map(p => p.join(',')).join(' ');
  const gridPoly = grid.map(p => p.join(',')).join(' ');
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon points={gridPoly} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {[0.25, 0.5, 0.75].map(f => (
        <polygon key={f} points={grid.map(([x,y]) => `${cx+(x-cx)*f},${cy+(y-cy)*f}`).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      <polygon points={poly} fill="rgba(0,229,255,0.18)" stroke="#00e5ff" strokeWidth="1.5" />
    </svg>
  );
}

export default function PlayerCard({ player, onClick, badges = [], imageOnly = false }) {
  const items = useShopItems();
  const ov  = overall(player);
  const t   = tier(ov);
  const pos = POSITIONS[player.position] || POSITIONS.MID;

  // ── Equipamiento cosmético ──
  const equipped       = player.equipped || {};
  const find           = id => id ? items.find(i => i.id === id) : null;
  const accentItem     = find(equipped.accent);
  const patternItem    = find(equipped.pattern);
  const frameItem      = find(equipped.frame);
  const stickerItem    = find(equipped.sticker);
  const backgroundItem = find(equipped.background);
  const titleItem      = find(equipped.title);

  const accentColor    = accentItem?.color || null;
  // Defaults (id frame_/pattern_) SIEMPRE usan su clase CSS animada,
  // aunque un override de admin haya guardado cssBoxShadow/cssBackground.
  // Solo los custom (id no-default) usan CSS inline.
  const isDefaultFrame   = frameItem?.id?.startsWith('frame_');
  const isDefaultPattern = patternItem?.id?.startsWith('pattern_');
  const frameClass     = isDefaultFrame
    ? `ff-${frameItem.id.replace('frame_', '')}` : '';
  const patternClass   = isDefaultPattern
    ? `fp-${patternItem.id.replace('pattern_', '')}` : '';
  const patternStyle   = (!isDefaultPattern && patternItem?.cssBackground) ? { background: patternItem.cssBackground } : null;
  const frameStyle     = (!isDefaultFrame   && frameItem?.cssBoxShadow)    ? { boxShadow:  frameItem.cssBoxShadow   } : null;
  const backgroundStyle= backgroundItem?.cssBackground ? { background: backgroundItem.cssBackground } : null;

  const statsHTML = SK.map(s => (
    <div key={s.key} className="fc-stat">
      <div className="fc-snum">{Math.round(player[s.key] ?? 50)}</div>
      <div className="fc-slbl">{s.label.slice(0,3).toUpperCase()}</div>
    </div>
  ));

  const status  = player.status || 'available';
  const out     = status === 'injured' || status === 'away';
  const outInfo = status === 'injured'
    ? { icon:'🤕', label:'LESIONADO',     col:'#ff9100' }
    : { icon:'🚫', label:'NO DISPONIBLE', col:'#ff5252' };

  const wins    = player.history?.wins    ?? 0;
  const matches = player.history?.matches ?? 0;
  const goals   = player.history?.goals   ?? 0;
  const assists = player.history?.assists ?? 0;
  const mvps    = player.history?.mvps    ?? 0;
  const wr      = matches ? Math.round(wins / matches * 100) : 0;

  return (
    <div
      className={`fc t-${t} ${frameClass}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        ...(accentColor ? { '--card-accent': accentColor } : {}),
        ...(frameStyle || {}),
        ...(out ? { filter:'grayscale(.85) brightness(.7)' } : {}),
      }}
    >
      <div className="fc-bg" style={backgroundStyle || undefined} />

      {/* Overlay no disponible / lesionado */}
      {out && (
        <div style={{ position:'absolute', inset:0, zIndex:5,
          display:'flex', flexDirection:'column', alignItems:'center',
          justifyContent:'center', gap:6, pointerEvents:'none',
          background:'rgba(0,0,0,.45)' }}>
          <div style={{ fontSize:'2.4em', lineHeight:1,
            filter:'drop-shadow(0 2px 6px rgba(0,0,0,.7))' }}>
            {outInfo.icon}
          </div>
          <div style={{ fontSize:'.7em', fontWeight:900, letterSpacing:1,
            color:'#fff', background:outInfo.col, padding:'2px 8px',
            borderRadius:4, fontFamily:"'Barlow Condensed',sans-serif" }}>
            {outInfo.label}
          </div>
        </div>
      )}
      {player.photo && (
        <>
          <div className="fc-photo" style={{
            backgroundImage: `url(${player.photo})`,
            // Si hay fondo custom equipado, atenuar la foto para que se vea
            ...(backgroundStyle ? { opacity: .82 } : {}),
          }} />
          <div className="fc-photo-overlay" />
        </>
      )}
      {(patternClass || patternStyle) && (
        <div className={`fc-pattern ${patternClass}`} style={patternStyle || undefined} />
      )}
      <div className="fc-shine" />
      <div className="fc-frame-el" />

      {badges.length > 0 && (
        <div className="fc-badges">
          {badges.map((b, i) => <span key={i} className="fc-badge">{b}</span>)}
        </div>
      )}

      {!imageOnly && (
      <div className="fc-in">
        <div className="fc-top">
          <div>
            <div className="fc-ov">{ov}</div>
            <div className="fc-pos">{pos.short}</div>
            <div style={{ fontSize:14, lineHeight:1, marginTop:2,
              filter:'drop-shadow(0 1px 3px rgba(0,0,0,.6))' }}>
              {TIER_SYMBOLS[t]}
            </div>
          </div>
          <div className="fc-right">
            <div className="fc-spi">{pos.emoji}</div>
            {stickerItem && (
              <div className="fc-sticker">
                {stickerItem.imageUrl
                  ? <img src={stickerItem.imageUrl} alt=""
                      style={{ width:30, height:30, objectFit:'contain',
                        filter:'drop-shadow(0 1px 3px rgba(0,0,0,.55))' }} />
                  : stickerItem.emoji}
              </div>
            )}
          </div>
        </div>

        {player.photo
          ? <div style={{ flex: 1 }} />
          : (
            <div className="fc-av" style={{
              background: 'rgba(0,229,255,0.15)',
              borderColor: 'rgba(0,229,255,0.3)',
              color: '#00e5ff',
              fontSize: 16,
            }}>
              {player.emoji || player.name?.[0]?.toUpperCase()}
            </div>
          )
        }

        <div className="fc-name">{player.nickname || player.name}</div>
        <div className="fc-sub">
          {titleItem ? titleItem.name.toUpperCase() : pos.name.toUpperCase()}
        </div>
        <div className="fc-div" />
        <div className="fc-stats">{statsHTML}</div>
        <div className="fc-mini">
          {matches} PJ · {wins} V · {wr}% WR
          {(goals > 0 || assists > 0 || mvps > 0) && (
            <><br />{goals}G · {assists}A · MVP x{mvps}</>
          )}
        </div>
      </div>
      )}

      {/* En modo imageOnly: igual mostrar posición + sticker arriba-derecha */}
      {imageOnly && (
        <div style={{ position:'absolute', top:8, right:8, zIndex:3,
          display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
          <div style={{ fontSize:20, lineHeight:1,
            filter:'drop-shadow(0 1px 3px rgba(0,0,0,.6))' }}>{pos.emoji}</div>
          {stickerItem && (
            <div style={{ fontSize:24, lineHeight:1,
              filter:'drop-shadow(0 1px 3px rgba(0,0,0,.55))' }}>
              {stickerItem.imageUrl
                ? <img src={stickerItem.imageUrl} alt=""
                    style={{ width:30, height:30, objectFit:'contain' }} />
                : stickerItem.emoji}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
