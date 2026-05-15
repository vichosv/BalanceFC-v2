// Gráfico de evolución de atributos a lo largo de partidos
import { SK } from '../utils/stats';

const COLORS = {
  vel: '#00e676',
  tec: '#00e5ff',
  def: '#448aff',
  tir: '#ff5252',
  sta: '#ffc107',
};
const LABELS = { vel:'VEL', tec:'TEC', def:'DEF', tir:'TIR', sta:'STA' };
const KEYS   = ['vel','tec','def','tir','sta'];

export default function StatEvolutionChart({ player, height = 180 }) {
  const history = (player.statHistory || []).slice().reverse(); // antiguo → reciente

  if (history.length < 2) {
    return (
      <div style={{ padding:'20px 10px', textAlign:'center',
        color:'var(--muted)', fontSize:12 }}>
        📈 Necesitas <b>al menos 2 partidos</b> para ver la evolución
      </div>
    );
  }

  // Punto inicial: el "before" del primer snapshot
  // Después: el "after" de cada snapshot
  const series = {};
  KEYS.forEach(k => {
    series[k] = [history[0].before[k], ...history.map(s => s.after[k])];
  });

  const width   = 320;
  const padL    = 32, padR = 12, padT = 10, padB = 22;
  const chartW  = width  - padL - padR;
  const chartH  = height - padT - padB;
  const N       = series.vel.length;

  // Rango Y dinámico, mínimo 20 puntos de rango
  const allVals = KEYS.flatMap(k => series[k]);
  let minY = Math.floor(Math.min(...allVals) - 2);
  let maxY = Math.ceil(Math.max(...allVals) + 2);
  if (maxY - minY < 20) {
    const mid = (maxY + minY) / 2;
    minY = Math.max(0,   Math.floor(mid - 10));
    maxY = Math.min(100, Math.ceil(mid + 10));
  }
  const rangeY = maxY - minY;

  const x = i => padL + (i / (N - 1)) * chartW;
  const y = v => padT + chartH - ((v - minY) / rangeY) * chartH;

  // Líneas de cuadrícula horizontales (4 líneas)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const val = Math.round(minY + f * rangeY);
    return { val, y: padT + chartH - f * chartH };
  });

  // Toggle de visibilidad: por ahora todos visibles
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`}
        style={{ display:'block', overflow:'visible' }}>

        {/* Cuadrícula */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={g.y} x2={width - padR} y2={g.y}
              stroke="rgba(255,255,255,.06)" strokeWidth={1} />
            <text x={padL - 6} y={g.y + 3} textAnchor="end"
              fontSize={9} fill="rgba(255,255,255,.4)" fontFamily="sans-serif">
              {g.val}
            </text>
          </g>
        ))}

        {/* Líneas de stats */}
        {KEYS.map(k => {
          const pts = series[k].map((v, i) => `${x(i)},${y(v)}`).join(' ');
          return (
            <polyline
              key={k}
              points={pts}
              fill="none"
              stroke={COLORS[k]}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          );
        })}

        {/* Puntos en último valor (más visible) */}
        {KEYS.map(k => {
          const v = series[k][N - 1];
          return (
            <circle key={k} cx={x(N - 1)} cy={y(v)} r={2.5}
              fill={COLORS[k]} stroke="rgba(0,0,0,.4)" strokeWidth={.6} />
          );
        })}

        {/* Eje X: número de partidos */}
        <text x={padL} y={height - 6} fontSize={9}
          fill="rgba(255,255,255,.4)" fontFamily="sans-serif">
          inicio
        </text>
        <text x={width - padR} y={height - 6} textAnchor="end" fontSize={9}
          fill="rgba(255,255,255,.4)" fontFamily="sans-serif">
          ahora ({history.length} PJ)
        </text>
      </svg>

      {/* Leyenda */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8,
        justifyContent:'center', marginTop:6 }}>
        {KEYS.map(k => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:4,
            fontSize:10, color:'var(--muted)' }}>
            <div style={{ width:10, height:3, borderRadius:1.5, background:COLORS[k] }} />
            <span style={{ fontWeight:700 }}>{LABELS[k]}</span>
            <span style={{ color:'var(--text)', fontWeight:800 }}>
              {Math.round(series[k][N - 1])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
