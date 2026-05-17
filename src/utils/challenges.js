// ── Retos semanales ───────────────────────────────────────────
// Set fijo que se resetea cada lunes. El progreso se calcula de los
// partidos de la semana actual del jugador.

export const WEEKLY_CHALLENGES = [
  { id:'goals_3',   icon:'⚽', title:'Goleador',        desc:'Mete 3 goles esta semana',          metric:'goals',   goal:3, reward:8  },
  { id:'assists_2', icon:'🎯', title:'Asistidor',       desc:'Da 2 asistencias esta semana',      metric:'assists', goal:2, reward:6  },
  { id:'play_2',    icon:'🏟️', title:'Presente',        desc:'Juega 2 partidos esta semana',      metric:'matches', goal:2, reward:5  },
  { id:'wins_2',    icon:'🏆', title:'Ganador',         desc:'Gana 2 partidos esta semana',       metric:'wins',    goal:2, reward:8  },
  { id:'mvp_1',     icon:'⭐', title:'Figura',          desc:'Sé MVP de un partido esta semana',  metric:'mvps',    goal:1, reward:12 },
  { id:'bigwin_1',  icon:'💥', title:'Goleada',         desc:'Gana por 3+ de diferencia',         metric:'bigwins', goal:1, reward:7  },
];

// Clave de la semana actual (lunes en formato YYYY-MM-DD)
export function weekKey(d = new Date()) {
  const date = new Date(d);
  const dow  = (date.getDay() + 6) % 7; // Lunes = 0
  date.setDate(date.getDate() - dow);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

// Timestamp del inicio de la semana actual
function weekStartTs(d = new Date()) {
  const date = new Date(d);
  const dow  = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dow);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// MVP de un partido según votos (mismo criterio que el resto de la app)
function matchMvp(m) {
  if (!m.votes || !Object.keys(m.votes).length) return null;
  if (m.createdAt && Date.now() - m.createdAt < 86400000) return null;
  const counts = {};
  Object.values(m.votes).forEach(v => { if (v.mvp) counts[v.mvp] = (counts[v.mvp] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

// Calcula el progreso de cada métrica para el jugador en la semana actual
export function computeWeeklyProgress(uid, matches) {
  const startTs = weekStartTs();
  const prog = { goals: 0, assists: 0, matches: 0, wins: 0, mvps: 0, bigwins: 0 };

  matches.forEach(m => {
    // Fecha del partido (preferir m.date, sino createdAt)
    const ts = m.date
      ? new Date(`${m.date}T${m.time || '00:00'}`).getTime()
      : (m.createdAt || 0);
    if (ts < startTs) return;

    const inA = (m.teamA || []).some(p => p.uid === uid);
    const inB = (m.teamB || []).some(p => p.uid === uid);
    const inC = (m.teamC || []).some(p => p.uid === uid);
    if (!inA && !inB && !inC) return;

    const ps = m.playerStats?.[uid] || {};
    prog.goals   += ps.goals   || 0;
    prog.assists += ps.assists || 0;
    prog.matches += 1;

    // Resultado
    const sA = m.scoreA ?? 0, sB = m.scoreB ?? 0, sC = m.scoreC ?? 0;
    let won = false, diff = 0;
    if (m.triangular) {
      const max = Math.max(sA, sB, sC);
      const myScore = inA ? sA : inB ? sB : sC;
      won  = myScore === max;
      diff = max - Math.min(sA, sB, sC);
    } else {
      const myScore  = inA ? sA : sB;
      const rivScore = inA ? sB : sA;
      won  = myScore > rivScore;
      diff = Math.abs(sA - sB);
    }
    if (won) {
      prog.wins += 1;
      if (diff >= 3) prog.bigwins += 1;
    }
    if (matchMvp(m) === uid) prog.mvps += 1;
  });

  return prog;
}

// Estado de cada reto: progreso, completado, reclamado
export function getChallengeState(player, matches) {
  const wk = weekKey();
  const claimed = player?.claimedChallenges || {};
  const prog = computeWeeklyProgress(player?.uid, matches);

  return WEEKLY_CHALLENGES.map(ch => {
    const current   = Math.min(prog[ch.metric] || 0, ch.goal);
    const done      = (prog[ch.metric] || 0) >= ch.goal;
    const claimedKey = `${wk}_${ch.id}`;
    const isClaimed = claimed[claimedKey] === true;
    return { ...ch, current, done, isClaimed, claimedKey };
  });
}
