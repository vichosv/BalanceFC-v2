// Visualizador de formación táctica para uno o más equipos
import { overall } from '../utils/stats';

const POS_ROW = {
  // Cada posición va en una fila (0 = abajo cerca del arco, 4 = arriba/ataque)
  GK:  0,
  DEF: 1,
  MID: 2,
  WNG: 2,  // WNG comparte fila con MID, pero se ubica en los costados
  FWD: 3,
};
const POS_EMOJI = { GK:'🧤', DEF:'🛡️', MID:'⚙️', WNG:'⚡', FWD:'🎯' };
const POS_COLOR = {
  GK:'#ffc107', DEF:'#448aff', MID:'#00e5ff', WNG:'#b44fff', FWD:'#ff5252',
};

// Distribuye jugadores en una fila con espaciado uniforme
function distributeRow(players, width, y, options = {}) {
  const N = players.length;
  if (N === 0) return [];
  const padX = options.padX ?? 14;
  const usable = width - padX * 2;
  if (N === 1) return [{ x: width / 2, y, player: players[0] }];
  return players.map((p, i) => ({
    x: padX + (i / (N - 1)) * usable,
    y, player: p,
  }));
}

function Pitch({ team, label, color, width = 280, height = 320, mirrored = false }) {
  // Agrupar jugadores por posición
  const groups = { GK:[], DEF:[], MID:[], WNG:[], FWD:[] };
  (team || []).forEach(p => {
    const pos = POS_ROW[p.position] !== undefined ? p.position : 'MID';
    groups[pos].push(p);
  });

  // Mezclar MID + WNG en la misma fila pero WNG a los costados
  const midRow = [...groups.WNG.slice(0, 1), ...groups.MID, ...groups.WNG.slice(1)];

  // Filas verticales (top→bottom si !mirrored, sino al revés)
  const padY = 28;
  const rowH = (height - padY * 2) / 4;
  const rowY = i => mirrored
    ? padY + i * rowH                // mirrored: FWD arriba, GK abajo
    : padY + (3 - i) * rowH;         // normal:    GK arriba, FWD abajo

  const positions = [
    ...distributeRow(groups.FWD,  width, rowY(3)),
    ...distributeRow(midRow,      width, rowY(2)),
    ...distributeRow(groups.DEF,  width, rowY(1)),
    ...distributeRow(groups.GK,   width, rowY(0)),
  ];

  return (
    <div style={{
      width, position:'relative', borderRadius:14, overflow:'hidden',
      background:'linear-gradient(180deg, #0d4a23 0%, #136b34 50%, #0d4a23 100%)',
      border:`2px solid ${color}`,
    }}>
      {/* Líneas de cancha */}
      <svg width={width} height={height} style={{ display:'block' }}>
        {/* Borde exterior */}
        <rect x={6} y={6} width={width - 12} height={height - 12}
          fill="none" stroke="rgba(255,255,255,.35)" strokeWidth={1.5} />
        {/* Línea media */}
        <line x1={6} y1={height / 2} x2={width - 6} y2={height / 2}
          stroke="rgba(255,255,255,.35)" strokeWidth={1.5} />
        {/* Círculo central */}
        <circle cx={width / 2} cy={height / 2} r={28}
          fill="none" stroke="rgba(255,255,255,.35)" strokeWidth={1.5} />
        <circle cx={width / 2} cy={height / 2} r={2}
          fill="rgba(255,255,255,.5)" />
        {/* Área grande arriba */}
        <rect x={width / 2 - 50} y={6} width={100} height={36}
          fill="none" stroke="rgba(255,255,255,.3)" strokeWidth={1.2} />
        {/* Área grande abajo */}
        <rect x={width / 2 - 50} y={height - 42} width={100} height={36}
          fill="none" stroke="rgba(255,255,255,.3)" strokeWidth={1.2} />

        {/* Jugadores */}
        {positions.map(({ x, y, player }) => (
          <PlayerDot key={player.uid} x={x} y={y} player={player} />
        ))}
      </svg>

      {/* Label del equipo */}
      <div style={{
        position:'absolute', top:8, left:'50%', transform:'translateX(-50%)',
        background:'rgba(0,0,0,.55)', borderRadius:6, padding:'2px 10px',
        fontSize:11, fontWeight:800, color, letterSpacing:.8,
      }}>
        {label}
      </div>
    </div>
  );
}

function PlayerDot({ x, y, player }) {
  const ov = overall(player);
  const emoji = POS_EMOJI[player.position] || '⚽';
  const color = POS_COLOR[player.position] || '#00e5ff';
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Círculo de fondo (foto o emoji) */}
      <circle cx={0} cy={0} r={16}
        fill={player.photo ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.7)'}
        stroke={color} strokeWidth={2} />
      {player.photo ? (
        <>
          <defs>
            <clipPath id={`clip-${player.uid}`}>
              <circle cx={0} cy={0} r={14} />
            </clipPath>
          </defs>
          <image href={player.photo} x={-14} y={-14} width={28} height={28}
            clipPath={`url(#clip-${player.uid})`} preserveAspectRatio="xMidYMid slice" />
        </>
      ) : (
        <text x={0} y={1} textAnchor="middle" dominantBaseline="middle"
          fontSize={14}>{emoji}</text>
      )}
      {/* OVR badge */}
      <rect x={-13} y={14} width={26} height={11} rx={3}
        fill="rgba(0,0,0,.85)" stroke={color} strokeWidth={.6} />
      <text x={0} y={20} textAnchor="middle" dominantBaseline="middle"
        fontSize={8} fontWeight={900} fill={color}
        fontFamily="'Barlow Condensed', sans-serif">{ov}</text>
      {/* Nombre */}
      <text x={0} y={-22} textAnchor="middle" fontSize={9} fontWeight={700}
        fill="#fff" stroke="rgba(0,0,0,.7)" strokeWidth={2.5} paintOrder="stroke"
        fontFamily="'Barlow Condensed', sans-serif">
        {(player.nickname || player.name || '').slice(0, 10)}
      </text>
    </g>
  );
}

export default function FormationView({ teams, triangular = false }) {
  // teams: { A: [...], B: [...], C?: [...] }
  const keys = triangular ? ['A','B','C'] : ['A','B'];
  const labels = { A:'EQUIPO A', B:'EQUIPO B', C:'EQUIPO C' };
  const colors = { A:'var(--green)', B:'var(--blue)', C:'var(--orange)' };

  if (triangular) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:12 }}>
        {keys.map(k => (
          <Pitch key={k} team={teams[k]} label={labels[k]} color={colors[k]}
            width={280} height={280} />
        ))}
      </div>
    );
  }

  // 2 equipos: uno mirado normal, el otro espejado para enfrentarse
  return (
    <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
      <div style={{ position:'relative' }}>
        <Pitch team={teams.A} label={labels.A} color="#00e676"
          width={300} height={210} mirrored={false} />
        <Pitch team={teams.B} label={labels.B} color="#448aff"
          width={300} height={210} mirrored={true} />
      </div>
    </div>
  );
}
