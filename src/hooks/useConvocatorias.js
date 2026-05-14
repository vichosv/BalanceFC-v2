import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

export function useConvocatorias() {
  const [convocatorias, setConvocatorias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'convocatorias'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setConvocatorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { convocatorias, loading };
}

export async function createConvocatoria(data) {
  return addDoc(collection(db, 'convocatorias'), {
    ...data,
    confirmados: [],
    maybe:       [],
    rechazados:  [],
    status:      'open',
    createdAt:   Date.now(),
  });
}

export async function respondConvocatoria(convId, allLists, player, response) {
  // Remove player from all lists first
  const clean = list => (list || []).filter(p => p.uid !== player.uid);

  const update = {
    confirmados: clean(allLists.confirmados),
    maybe:       clean(allLists.maybe),
    rechazados:  clean(allLists.rechazados),
  };

  // Add to the chosen list (except if response is 'remove')
  if (response !== 'remove') {
    const entry = {
      uid:       player.uid,
      nickname:  player.nickname,
      position:  player.position,
      timestamp: Date.now(),
    };
    update[response] = [...update[response], entry];
  }

  await updateDoc(doc(db, 'convocatorias', convId), update);
}

export async function deleteConvocatoria(convId) {
  await deleteDoc(doc(db, 'convocatorias', convId));
}
