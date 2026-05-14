import { overall } from './stats';

// tier: 'common' | 'rare' | 'epic' | 'legendary'
export const LOGROS = [
  // ── Debut ──────────────────────────────────────────────────
  {
    id: 'debut',
    emoji: '👟', name: 'Debutante',
    desc: 'Jugaste tu primer partido',
    tier: 'common',
    check: (p) => (p.history?.matches || 0) >= 1,
  },
  {
    id: 'primer_gol',
    emoji: '⚽', name: 'Primer Gol',
    desc: 'Anotaste tu primer gol',
    tier: 'common',
    check: (p) => (p.history?.goals || 0) >= 1,
  },
  {
    id: 'primera_asist',
    emoji: '🅰️', name: 'Primera Asistencia',
    desc: 'Tu primera asistencia',
    tier: 'common',
    check: (p) => (p.history?.assists || 0) >= 1,
  },

  // ── Goles ──────────────────────────────────────────────────
  {
    id: 'goleador10',
    emoji: '🎯', name: 'Goleador',
    desc: '10 goles en total',
    tier: 'rare',
    check: (p) => (p.history?.goals || 0) >= 10,
  },
  {
    id: 'goleador25',
    emoji: '🔫', name: 'Francotirador',
    desc: '25 goles en total',
    tier: 'epic',
    check: (p) => (p.history?.goals || 0) >= 25,
  },
  {
    id: 'goleador50',
    emoji: '💣', name: 'Máquina',
    desc: '50 goles en total',
    tier: 'legendary',
    check: (p) => (p.history?.goals || 0) >= 50,
  },

  // ── Asistencias ────────────────────────────────────────────
  {
    id: 'assist10',
    emoji: '🪄', name: 'Asistidor',
    desc: '10 asistencias en total',
    tier: 'rare',
    check: (p) => (p.history?.assists || 0) >= 10,
  },
  {
    id: 'assist25',
    emoji: '🎩', name: 'Mago',
    desc: '25 asistencias en total',
    tier: 'epic',
    check: (p) => (p.history?.assists || 0) >= 25,
  },

  // ── Victorias ──────────────────────────────────────────────
  {
    id: 'wins1',
    emoji: '🥇', name: 'Primera Victoria',
    desc: 'Ganaste tu primer partido',
    tier: 'common',
    check: (p) => (p.history?.wins || 0) >= 1,
  },
  {
    id: 'wins10',
    emoji: '🏆', name: 'Campeón',
    desc: '10 victorias',
    tier: 'rare',
    check: (p) => (p.history?.wins || 0) >= 10,
  },
  {
    id: 'wins25',
    emoji: '👑', name: 'Rey',
    desc: '25 victorias',
    tier: 'epic',
    check: (p) => (p.history?.wins || 0) >= 25,
  },

  // ── Partidos ───────────────────────────────────────────────
  {
    id: 'matches20',
    emoji: '💪', name: 'Veterano',
    desc: '20 partidos jugados',
    tier: 'rare',
    check: (p) => (p.history?.matches || 0) >= 20,
  },
  {
    id: 'matches50',
    emoji: '🏟️', name: 'Leyenda Viva',
    desc: '50 partidos jugados',
    tier: 'legendary',
    check: (p) => (p.history?.matches || 0) >= 50,
  },

  // ── Win rate ───────────────────────────────────────────────
  {
    id: 'wr80',
    emoji: '🛡️', name: 'Invicto',
    desc: '80%+ WR con al menos 10 partidos',
    tier: 'epic',
    check: (p) => {
      const pj = p.history?.matches || 0;
      return pj >= 10 && (p.history?.wins || 0) / pj >= 0.8;
    },
  },
  {
    id: 'wr100',
    emoji: '💯', name: 'Perfecto',
    desc: '100% WR con al menos 5 partidos',
    tier: 'legendary',
    check: (p) => {
      const pj = p.history?.matches || 0;
      return pj >= 5 && (p.history?.wins || 0) === pj;
    },
  },

  // ── MVP ────────────────────────────────────────────────────
  {
    id: 'mvp1',
    emoji: '⭐', name: 'MVP',
    desc: 'Elegido MVP en un partido',
    tier: 'rare',
    check: (p, { mvpCount }) => mvpCount >= 1,
  },
  {
    id: 'mvp5',
    emoji: '🌟', name: 'El Mejor',
    desc: 'Elegido MVP 5 veces',
    tier: 'legendary',
    check: (p, { mvpCount }) => mvpCount >= 5,
  },

  // ── OVR ────────────────────────────────────────────────────
  {
    id: 'ovr65',
    emoji: '📊', name: 'En Progreso',
    desc: 'OVR 65 o superior',
    tier: 'common',
    check: (p) => overall(p) >= 65,
  },
  {
    id: 'ovr70',
    emoji: '📈', name: 'En Forma',
    desc: 'OVR 70 o superior',
    tier: 'common',
    check: (p) => overall(p) >= 70,
  },
  {
    id: 'ovr75',
    emoji: '⚡', name: 'Prometedor',
    desc: 'OVR 75 o superior',
    tier: 'rare',
    check: (p) => overall(p) >= 75,
  },
  {
    id: 'ovr80',
    emoji: '🔥', name: 'Top',
    desc: 'OVR 80 o superior',
    tier: 'rare',
    check: (p) => overall(p) >= 80,
  },
  {
    id: 'ovr82',
    emoji: '💎', name: 'Élite',
    desc: 'OVR 82 o superior',
    tier: 'epic',
    check: (p) => overall(p) >= 82,
  },
  {
    id: 'ovr85',
    emoji: '🌟', name: 'Estrella',
    desc: 'OVR 85 o superior',
    tier: 'epic',
    check: (p) => overall(p) >= 85,
  },
  {
    id: 'ovr87',
    emoji: '👑', name: 'Crack',
    desc: 'OVR 87 o superior',
    tier: 'legendary',
    check: (p) => overall(p) >= 87,
  },
  {
    id: 'ovr90',
    emoji: '🏅', name: 'Leyenda',
    desc: 'OVR 90 o superior',
    tier: 'legendary',
    check: (p) => overall(p) >= 90,
  },
];

// Colores por tier
export const TIER_COLOR = {
  common:    { bg:'rgba(150,150,150,.12)', border:'rgba(150,150,150,.3)', text:'#aaa' },
  rare:      { bg:'rgba(68,138,255,.12)',  border:'rgba(68,138,255,.35)', text:'var(--blue)' },
  epic:      { bg:'rgba(180,80,255,.12)',  border:'rgba(180,80,255,.35)', text:'#b44fff' },
  legendary: { bg:'rgba(255,215,64,.12)', border:'rgba(255,215,64,.4)',  text:'var(--yellow)' },
};

// Devuelve { unlocked: [...], locked: [...] }
// Los manualLogros (array de IDs en player.manualLogros) siempre cuentan como unlocked
export function computeLogros(player, { mvpCount = 0 } = {}) {
  const ctx    = { mvpCount };
  const manual = new Set(player.manualLogros || []);
  const unlocked = LOGROS.filter(l => l.check(player, ctx) || manual.has(l.id));
  const locked   = LOGROS.filter(l => !l.check(player, ctx) && !manual.has(l.id));
  return { unlocked, locked };
}
