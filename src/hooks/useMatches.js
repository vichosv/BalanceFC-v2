import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, getDocs,
  query, orderBy, where, doc, updateDoc, increment,
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
    // 🪙 Monedas: +2 por partido + 1 por gol (solo al agregar, no al borrar)
    const coinUpdate = mult > 0
      ? { coins: increment(2 + (ps.goals || 0)) }
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
  await resolveBets(data);
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
}
