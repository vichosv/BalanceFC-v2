import { overall, tier, SK } from '../utils/stats';
import { SHOP_ITEMS } from '../utils/shop';

const POSITIONS = {
  GK:  { short:'GK',  name:'Arquero',    emoji:'🧤' },
  DEF: { short:'DEF', name:'Defensor',   emoji:'🛡️' },
  MID: { short:'MID', name:'Mediocampo', emoji:'⚙️' },
  WNG: { short:'WNG', name:'Extremo',    emoji:'⚡' },
  FWD: { short:'FWD', name:'Delantero',  emoji:'🎯' },
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

export default function PlayerCard({ player, onClick, badges = [] }) {
  const ov  = overall(player);
  const t   = tier(ov);
  const pos = POSITIONS[player.position] || POSITIONS.MID;

  // ── Equipamiento cosmético ──
  const equipped    = player.equipped || {};
  const accentItem   = equipped.accent  ? SHOP_ITEMS.find(i => i.id === equipped.accent)  : null;
  const patternItem  = equipped.pattern ? SHOP_ITEMS.find(i => i.id === equipped.pattern) : null;
  const frameItem    = equipped.frame   ? SHOP_ITEMS.find(i => i.id === equipped.frame)   : null;
  const stickerItem  = equipped.sticker ? SHOP_ITEMS.find(i => i.id === equipped.sticker) : null;
  const accentColor  = accentItem?.color || null;
  const patternClass = patternItem ? `fp-${patternItem.id.replace('pattern_', '')}` : '';
  const frameClass   = frameItem   ? `ff-${frameItem.id.replace('frame_', '')}`     : '';

  const statsHTML = SK.map(s => (
    <div key={s.key} className="fc-stat">
      <div className="fc-snum">{Math.round(player[s.key] ?? 50)}</div>
      <div className="fc-slbl">{s.label.slice(0,3).toUpperCase()}</div>
    </div>
  ));

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
      }}
    >
      <div className="fc-bg" />
      {player.photo && (
        <>
          <div className="fc-photo" style={{ backgroundImage: `url(${player.photo})` }} />
          <div className="fc-photo-overlay" />
        </>
      )}
      {patternClass && <div className={`fc-pattern ${patternClass}`} />}
      <div className="fc-shine" />
      <div className="fc-frame-el" />

      {badges.length > 0 && (
        <div className="fc-badges">
          {badges.map((b, i) => <span key={i} className="fc-badge">{b}</span>)}
        </div>
      )}

      <div className="fc-in">
        <div className="fc-top">
          <div>
            <div className="fc-ov">{ov}</div>
            <div className="fc-pos">{pos.short}</div>
          </div>
          <div className="fc-right">
            <div className="fc-spi">{pos.emoji}</div>
            {stickerItem && <div className="fc-sticker">{stickerItem.emoji}</div>}
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
        <div className="fc-sub">{pos.name.toUpperCase()}</div>
        <div className="fc-div" />
        <div className="fc-stats">{statsHTML}</div>
        <div className="fc-mini">
          {matches} PJ · {wins} V · {wr}% WR
          {(goals > 0 || assists > 0 || mvps > 0) && (
            <><br />{goals}G · {assists}A · MVP x{mvps}</>
          )}
        </div>
      </div>
    </div>
  );
}
