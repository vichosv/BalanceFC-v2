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

export async function logMatch(data) {
  const { teamA, teamB, teamC, scoreA, scoreB, scoreC, mvpA, mvpB, mvpC, triangular } = data;

  // Save match document
  await addDoc(collection(db, 'matches'), { ...data, createdAt: Date.now() });

  // Determine winners (2-team)
  const aWin = !triangular && scoreA > scoreB;
  const bWin = !triangular && scoreB > scoreA;

  // Triangular: team with most goals wins; tie → both win
  const triMax = triangular ? Math.max(scoreA, scoreB, scoreC) : 0;
  const triWin = (score) => triangular && score === triMax;

  const updates = [];

  const updateTeam = (team, score, mvp, wins) => {
    team.forEach(p => {
      updates.push(
        updateDoc(doc(db, 'players', p.uid), {
          'history.matches': increment(1),
          'history.wins':    increment(wins ? 1 : 0),
          'history.mvps':    increment(p.uid === mvp ? 1 : 0),
        })
      );
    });
  };

  updateTeam(teamA, scoreA, mvpA, triangular ? triWin(scoreA) : aWin);
  updateTeam(teamB, scoreB, mvpB, triangular ? triWin(scoreB) : bWin);
  if (triangular && teamC?.length) {
    updateTeam(teamC, scoreC, mvpC, triWin(scoreC));
  }

  await Promise.all(updates);
}
