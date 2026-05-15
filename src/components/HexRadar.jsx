// Hexagonal radar chart — same layout as FC series
// Clockwise from top: TIR(ATT) · TEC · STA · DEF · FIS(POW) · VEL(SPD)
const ORDER  = ['tir', 'tec', 'sta', 'def', 'fis', 'vel'];
const LABELS = { tir:'ATT', tec:'TEC', sta:'STA', def:'DEF', fis:'FIS', vel:'VEL' };

export default function HexRadar({ player, size = 200 }) {
  const cx = size / 2;
  const cy = size / 2;
  const R  = size * 0.31;   // outer hex radius
  const LR = size * 0.44;   // label radius

  // point on hex at axis i, magnitude level (0–1)
  const pt = (i, level) => {
    const a = -Math.PI / 2 + (Math.PI * 2 / 6) * i;
    return [cx + R * level * Math.cos(a), cy + R * level * Math.sin(a)];
  };

  const toPath = pts =>
    pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ') + 'Z';

  const outerRings = [0.25, 0.5, 0.75, 1];
  const statPts    = ORDER.map((k, i) => pt(i, Math.max(0.08, Math.round(player[k] ?? 50) / 100)));

  const labelPts = ORDER.map((k, i) => {
    const a = -Math.PI / 2 + (Math.PI * 2 / 6) * i;
    return { k, x: cx + LR * Math.cos(a), y: cy + LR * Math.sin(a) };
  });

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display:'block', overflow:'visible' }}
    >
      {/* Background rings */}
      {outerRings.map((lvl, ri) => (
        <path
          key={ri}
          d={toPath(Array.from({ length: 6 }, (_, i) => pt(i, lvl)))}
          fill={lvl === 1 ? 'rgba(255,255,255,.04)' : 'none'}
          stroke={lvl === 1 ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.07)'}
          strokeWidth={lvl === 1 ? 1.5 : 1}
        />
      ))}

      {/* Axis lines */}
      {ORDER.map((_, i) => {
        const [x2, y2] = pt(i, 1);
        return (
          <line key={i}
            x1={cx} y1={cy} x2={x2} y2={y2}
            stroke="rgba(255,255,255,.09)" strokeWidth={1} />
        );
      })}

      {/* Stat polygon */}
      <path
        d={toPath(statPts)}
        fill="rgba(255,82,82,.20)"
        stroke="#ff5252"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />

      {/* Stat dots */}
      {statPts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5}
          fill="#ff5252" stroke="rgba(0,0,0,.5)" strokeWidth={.8} />
      ))}

      {/* Labels */}
      {labelPts.map(({ k, x, y }) => (
        <text
          key={k}
          x={x} y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={Math.round(size * 0.058)}
          fontWeight={700}
          letterSpacing={1}
          fill="rgba(255,255,255,.72)"
          fontFamily="'Barlow Condensed', sans-serif"
        >
          {LABELS[k]}
        </text>
      ))}
    </svg>
  );
}
