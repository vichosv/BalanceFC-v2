import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, query,
  where, orderBy, doc, updateDoc, increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export function useBets(uid) {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const q = query(
      collection(db, 'bets'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      setBets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return { bets, loading };
}

export async function placeBet(uid, type, amount) {
  await updateDoc(doc(db, 'players', uid), { coins: increment(-amount) });
  await addDoc(collection(db, 'bets'), {
    uid,
    type,
    amount,
    status: 'pending',
    createdAt: Date.now(),
  });
}
