import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

// Own player profile
export function usePlayer(uid) {
  const [player,  setPlayer]  = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, 'players', uid), snap => {
      setPlayer(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return { player, loading };
}

// All players
export function usePlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'players'), snap => {
      setPlayers(snap.docs.map(d => d.data()));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { players, loading };
}
