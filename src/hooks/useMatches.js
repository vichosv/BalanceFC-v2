import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc,
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

// data.playerStats = { [uid]: { goals: n, assists: n } }
export async function logMatch(data) {
  const { teamA, teamB, teamC, scoreA, scoreB, scoreC, triangular, playerStats = {}, seasonId } = data;

  await addDoc(collection(db, 'matches'), { ...data, createdAt: Date.now() });

  const aWin   = !triangular && scoreA > scoreB;
  const bWin   = !triangular && scoreB > scoreA;
  const triMax = triangular ? Math.max(scoreA, scoreB, scoreC) : 0;
  const triWin = score => triangular && score === triMax;

  const sid     = seasonId || null;
  const updates = [];

  const updateTeam = (team, wins) => {
    team.forEach(p => {
      const ps      = playerStats[p.uid] || {};
      const goals   = ps.goals   || 0;
      const assists = ps.assists || 0;

      const global = {
        'history.matches': increment(1),
        'history.wins':    increment(wins ? 1 : 0),
        'history.goals':   increment(goals),
        'history.assists': increment(assists),
      };
      const seasonal = sid ? {
        [`seasons.${sid}.matches`]: increment(1),
        [`seasons.${sid}.wins`]:    increment(wins ? 1 : 0),
        [`seasons.${sid}.goals`]:   increment(goals),
        [`seasons.${sid}.assists`]: increment(assists),
      } : {};

      updates.push(updateDoc(doc(db, 'players', p.uid), { ...global, ...seasonal }));
    });
  };

  updateTeam(teamA, triangular ? triWin(scoreA) : aWin);
  updateTeam(teamB, triangular ? triWin(scoreB) : bWin);
  if (triangular && teamC?.length) updateTeam(teamC, triWin(scoreC));

  await Promise.all(updates);
}
