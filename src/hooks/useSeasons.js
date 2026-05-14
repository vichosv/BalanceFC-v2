import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useSeasons() {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'seasons'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setSeasons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const activeSeason = seasons.find(s => s.status === 'open') || null;

  return { seasons, activeSeason, loading };
}

export async function createSeason(name, createdBy) {
  return addDoc(collection(db, 'seasons'), {
    name,
    status:    'open',
    createdBy,
    createdAt: Date.now(),
  });
}

export async function closeSeason(seasonId) {
  await updateDoc(doc(db, 'seasons', seasonId), {
    status:   'closed',
    closedAt: Date.now(),
  });
}
