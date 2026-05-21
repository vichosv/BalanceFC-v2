import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Momentos de un partido (gol/atajada/errado/blooper) con timestamp del video.
export function useMoments(matchId) {
  const [moments, setMoments] = useState([]);
  useEffect(() => {
    if (!matchId) { setMoments([]); return; }
    // Sin orderBy para no requerir índice compuesto; se ordena en cliente.
    const q = query(collection(db, 'moments'), where('matchId', '==', matchId));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.time || 0) - (b.time || 0));
      setMoments(list);
    });
    return unsub;
  }, [matchId]);
  return moments;
}

export async function addMoment(data) {
  return addDoc(collection(db, 'moments'), { ...data, createdAt: Date.now() });
}

export async function deleteMoment(id) {
  return deleteDoc(doc(db, 'moments', id));
}
