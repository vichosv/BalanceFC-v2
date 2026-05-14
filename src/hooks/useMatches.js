import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc,
  query, orderBy, doc, updateDoc, increment,
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
    updates.push(updateDoc(doc(db, 'players', p.uid), { ...global, ...seasonal }));
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

// ── Public API ────────────────────────────────────────────────

// data.playerStats = { [uid]: { goals: n, assists: n } }
export async function logMatch(data) {
  await addDoc(collection(db, 'matches'), { ...data, createdAt: Date.now() });
  await Promise.all(buildStatUpdates(data, 1));
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
