import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, getDocs, getDoc,
  query, orderBy, where, limit, doc, updateDoc, increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export function useMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { matches, loading };
}

// ── Shared helpers ────────────────────────────────────────────
function computeWins({ scoreA, scoreB, scoreC, triangular }) {
  if (triangular) {
    const max = Math.max(scoreA, scoreB, scoreC ?? -1);
    return { wA: scoreA === max, wB: scoreB === max, wC: (scoreC ?? -1) === max };
  }
  return { wA: scoreA > scoreB, wB: scoreB > scoreA, wC: false };
}

function applyTeamStats(team, wins, playerStats, sid, mult, updates) {
  (team || []).forEach(p => {
    const ps      = playerStats?.[p.uid] || {};
    const goals   = (ps.goals   || 0) * mult;
    const assists = (ps.assists || 0) * mult;
    const w       = (wins ? 1 : 0) * mult;
    const global  = {
      'history.matches': increment(mult),
      'history.wins':    increment(w),
      'history.goals':   increment(goals),
      'history.assists': increment(assists),
    };
    const seasonal = sid ? {
      [`seasons.${sid}.matches`]: increment(mult),
      [`seasons.${sid}.wins`]:    increment(w),
      [`seasons.${sid}.goals`]:   increment(goals),
      [`seasons.${sid}.assists`]: increment(assists),
    } : {};
    // 🪙 Monedas: +2 por partido + 1 por gol + 1 si gana (solo al agregar)
    const coinUpdate = mult > 0
      ? { coins: increment(2 + (ps.goals || 0) + (wins ? 1 : 0)) }
      : {};
    updates.push(updateDoc(doc(db, 'players', p.uid), { ...global, ...seasonal, ...coinUpdate }));
  });
}

function buildStatUpdates(matchData, mult) {
  const { teamA, teamB, teamC, triangular, playerStats = {}, seasonId } = matchData;
  const { wA, wB, wC } = computeWins(matchData);
  const sid = seasonId || null;
  const updates = [];
  applyTeamStats(teamA, wA, playerStats, sid, mult, updates);
  applyTeamStats(teamB, wB, playerStats, sid, mult, updates);
  if (triangular) applyTeamStats(teamC, wC, playerStats, sid, mult, updates);
  return updates;
}

// ── Stat evolution (same logic as v1) ────────────────────────
// clamp: 1 decimal, range 10-100 (same as v1)
const clampStat = v => Math.min(100, Math.max(10, Math.round(v * 10) / 10));

function getTopVoter(votes, field) {
  if (!votes) return null;
  const counts = {};
  Object.values(votes).forEach(v => { if (v[field]) counts[v[field]] = (counts[v[field]] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

async function applyStatEvolution(matchData) {
  const {
    teamA, teamB, teamC, triangular,
    playerStats = {}, scoreA = 0, scoreB = 0, scoreC = 0, votes,
  } = matchData;
  const { wA, wB, wC } = computeWins(matchData);

  const mvpUid = getTopVoter(votes, 'mvp');
  const gkUid  = getTopVoter(votes, 'gk');

  // Build per-player context
  const entries = [];
  if (!triangular) {
    const marginAB = (scoreA || 0) - (scoreB || 0);
    (teamA || []).forEach(p => entries.push({
      uid: p.uid, position: p.position, won: wA,
      draw: marginAB === 0, margin: marginAB, rivalScore: scoreB || 0,
    }));
    (teamB || []).forEach(p => entries.push({
      uid: p.uid, position: p.position, won: wB,
      draw: marginAB === 0, margin: -marginAB, rivalScore: scoreA || 0,
    }));
  } else {
    const maxScore = Math.max(scoreA || 0, scoreB || 0, scoreC || 0);
    [[teamA, scoreA || 0, wA], [teamB, scoreB || 0, wB], [teamC || [], scoreC || 0, wC]]
      .forEach(([team, score, won]) => {
        (team || []).forEach(p => entries.push({
          uid: p.uid, position: p.position, won, draw: false,
          margin: score - maxScore, rivalScore: maxScore,
        }));
      });
  }

  if (!entries.length) return;
  const uids = [...new Set(entries.map(e => e.uid).filter(Boolean))];

  // Fetch player docs + recent matches in parallel
  const [playerSnaps, recentSnap] = await Promise.all([
    Promise.all(uids.map(uid => getDoc(doc(db, 'players', uid)))),
    getDocs(query(collection(db, 'matches'), orderBy('createdAt', 'desc'), limit(30))),
  ]);

  const playerMap = {};
  playerSnaps.forEach((snap, i) => { if (snap.exists()) playerMap[uids[i]] = snap.data(); });
  const recentMatches = recentSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Streak of consecutive W/L/D for a player
  function getStreak(uid) {
    let streak = 0, result = null;
    for (const m of recentMatches) {
      const inA = (m.teamA || []).some(p => p.uid === uid);
      const inB = (m.teamB || []).some(p => p.uid === uid);
      const inC = (m.teamC || []).some(p => p.uid === uid);
      if (!inA && !inB && !inC) continue;
      const { wA: mA, wB: mB, wC: mC } = computeWins(m);
      const won  = (inA && mA) || (inB && mB) || (inC && mC);
      const draw = !m.triangular && (m.scoreA === m.scoreB);
      const r    = draw ? 'D' : won ? 'W' : 'L';
      if (result === null) result = r;
      if (r === result) streak++;
      else break;
    }
    return { streak, result };
  }

  // Goals in last n matches for a player
  function golesUltimos(uid, n) {
    let goals = 0, pj = 0;
    for (const m of recentMatches) {
      const inAny = [...(m.teamA || []), ...(m.teamB || []), ...(m.teamC || [])]
        .some(p => p.uid === uid);
      if (!inAny) continue;
      goals += m.playerStats?.[uid]?.goals || 0;
      pj++;
      if (pj >= n) break;
    }
    return { goals, pj };
  }

  const updates = [];

  entries.forEach(entry => {
    const p = playerMap[entry.uid];
    if (!p) return;
    const ps          = playerStats[entry.uid] || {};
    const goles       = ps.goals   || 0;
    const asistencias = ps.assists || 0;
    const cambios     = { vel: 0, tec: 0, def: 0, tir: 0, sta: 0 };

    // ⚽ Goles → tir
    if (goles > 0) {
      cambios.tir += goles * 1.0;
      if (goles >= 3) cambios.tir += 2.0; // hat-trick bonus
    }
    // 🅰️ Asistencias → tec
    if (asistencias > 0) cambios.tec += asistencias * 0.8;
    // ⭐ MVP → tec
    if (mvpUid === entry.uid) cambios.tec += 1.5;

    // 💪 Resultado → sta
    if (entry.won)        cambios.sta += 0.5;
    else if (!entry.draw) cambios.sta -= 0.5;

    // 🛡️ Defensa según margen
    const lost = Math.abs(entry.margin);
    if (entry.draw) {
      cambios.def += 0.8;
    } else if (entry.won) {
      if (entry.margin === 1) cambios.def += 0.5; // ganar raspando
    } else {
      if      (lost === 1)             cambios.def += 1.0;
      else if (lost === 2)             cambios.def += 0.5;
      else if (lost >= 3 && lost <= 4) cambios.def -= 1.0;
      else if (lost >= 5)              { cambios.def -= 1.5; cambios.sta -= 1.5; }
    }

    // 🧤 Arquero
    if (gkUid === entry.uid) {
      cambios.def += 1.5;
      if (entry.rivalScore >= 4) cambios.def -= 1.0; // recibió 4+ goles
    }

    // ⚡ Racha 3+ victorias → vel; 3+ derrotas → sta
    const { streak, result } = getStreak(entry.uid);
    if (streak >= 3 && result === 'W') cambios.vel += 1.0;
    if (streak >= 3 && result === 'L') cambios.sta -= 0.8;

    // 📉 FWD/WNG sin goles en últimos 5 PJ → tir
    if (entry.position === 'FWD' || entry.position === 'WNG') {
      const ult = golesUltimos(entry.uid, 5);
      if (ult.pj >= 5 && ult.goals === 0) cambios.tir -= 0.8;
    }

    // 📉 10+ PJ sin MVP → tec
    if ((p.history?.matches || 0) >= 10 && (p.history?.mvps || 0) === 0) cambios.tec -= 0.5;

    // Aplicar con rendimientos decrecientes (subir cuesta más cuanto más alto estás)
    const newStats = {};
    const before   = {};
    const after    = {};
    let hasChange  = false;
    ['vel', 'tec', 'def', 'tir', 'sta'].forEach(k => {
      const cur = p[k] || 50;
      before[k] = cur;
      if (cambios[k] === 0) { after[k] = cur; return; }
      const factor = cambios[k] > 0
        ? Math.max(0.05, 1 - Math.pow((cur - 10) / 90, 1.8))
        : 1;
      const next = clampStat(cur + cambios[k] * factor);
      after[k] = next;
      if (next !== cur) { newStats[k] = next; hasChange = true; }
    });

    if (hasChange) {
      // Guardar snapshot en statHistory (máx 50 entradas)
      const prevHistory = p.statHistory || [];
      const snapshot = {
        ts:    Date.now(),
        date:  matchData.date || new Date().toISOString().slice(0, 10),
        before, after, delta: { ...cambios },
      };
      const statHistory = [snapshot, ...prevHistory].slice(0, 50);
      updates.push(updateDoc(doc(db, 'players', entry.uid),
        { ...newStats, statHistory }));
    }
  });

  await Promise.all(updates);
}

// ── Bet resolution ────────────────────────────────────────────
async function resolveBets(matchData) {
  const { teamA, teamB, teamC, triangular, playerStats = {}, scoreA, scoreB } = matchData;
  const { wA, wB, wC } = computeWins(matchData);
  const goalDiff = triangular ? 0 : Math.abs((scoreA || 0) - (scoreB || 0));

  const allPlayers = [
    ...(teamA  || []).map(p => ({ uid: p.uid, won: wA })),
    ...(teamB  || []).map(p => ({ uid: p.uid, won: wB })),
    ...(triangular ? (teamC || []).map(p => ({ uid: p.uid, won: wC })) : []),
  ];
  const uids = allPlayers.map(p => p.uid).filter(Boolean);
  if (!uids.length) return;

  // Firestore 'in' supports up to 30 items — futsal fits easily
  const q = query(
    collection(db, 'bets'),
    where('uid', 'in', uids),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const updates = [];
  snap.docs.forEach(betDoc => {
    const bet    = betDoc.data();
    const info   = allPlayers.find(p => p.uid === bet.uid);
    if (!info) return;
    const ps     = playerStats[bet.uid] || {};
    let won = false;
    if      (bet.type === 'team_win') won = info.won;
    else if (bet.type === 'i_score')  won = (ps.goals || 0) >= 1;
    else if (bet.type === 'big_win')  won = info.won && goalDiff >= 3;

    updates.push(updateDoc(doc(db, 'bets', betDoc.id), {
      status: won ? 'won' : 'lost',
      resolvedAt: Date.now(),
    }));
    if (won) {
      updates.push(updateDoc(doc(db, 'players', bet.uid), {
        coins: increment(bet.amount * 2),
      }));
    }
  });
  await Promise.all(updates);
}

// ── Public API ────────────────────────────────────────────────

// data.playerStats = { [uid]: { goals: n, assists: n } }
export async function logMatch(data) {
  await addDoc(collection(db, 'matches'), { ...data, createdAt: Date.now() });
  await Promise.all(buildStatUpdates(data, 1));
  await Promise.all([resolveBets(data), applyStatEvolution(data)]);
}

export async function deleteMatch(match) {
  await deleteDoc(doc(db, 'matches', match.id));
  await Promise.all(buildStatUpdates(match, -1));
}

export async function updateMatch(oldMatch, newData) {
  // Preserve original seasonId and createdAt
  const merged = { ...newData, seasonId: oldMatch.seasonId, createdAt: oldMatch.createdAt };
  const { id, ...docData } = { ...merged };
  await updateDoc(doc(db, 'matches', oldMatch.id), docData);
  // Reverse old stats, apply new stats
  await Promise.all([
    ...buildStatUpdates(oldMatch, -1),
    ...buildStatUpdates(merged,   1),
  ]);
}

export async function setMatchVideo(matchId, videoUrl) {
  await updateDoc(doc(db, 'matches', matchId), { videoUrl: videoUrl || null });
}

export async function castVote(matchId, uid, { mvp, gk }) {
  await updateDoc(doc(db, 'matches', matchId), {
    [`votes.${uid}`]: { mvp, gk, votedAt: Date.now() },
  });
  // Re-leer y otorgar +1 al MVP / arquero líder (una sola vez por partido)
  const snap = await getDoc(doc(db, 'matches', matchId));
  if (!snap.exists()) return;
  const m = snap.data();
  const updates = [];

  const mvpUid = getTopVoter(m.votes, 'mvp');
  if (mvpUid && !m.mvpAwardedUid) {
    updates.push(updateDoc(doc(db, 'players', mvpUid), { coins: increment(1) }));
    updates.push(updateDoc(doc(db, 'matches', matchId), { mvpAwardedUid: mvpUid }));
  }
  const gkUid = getTopVoter(m.votes, 'gk');
  if (gkUid && !m.gkAwardedUid) {
    updates.push(updateDoc(doc(db, 'players', gkUid), { coins: increment(1) }));
    updates.push(updateDoc(doc(db, 'matches', matchId), { gkAwardedUid: gkUid }));
  }
  await Promise.all(updates);
}
