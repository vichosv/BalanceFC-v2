import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useConvocatorias() {
  const [convocatorias, setConvocatorias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'convocatorias'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, snap => {
      const now = Date.now();
      setConvocatorias(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => {
            if (!c.date || !c.time) return true;
            return new Date(`${c.date}T${c.time}`).getTime() > now;
          })
      );
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
    status:      'open',
    createdAt:   Date.now(),
  });
}

export async function joinConvocatoria(convId, confirmados, player) {
  try {
    const already = (confirmados || []).some(p => p.uid === player.uid);
    if (already) return;
    await updateDoc(doc(db, 'convocatorias', convId), {
      confirmados: [...(confirmados || []), {
        uid:       player.uid,
        nickname:  player.nickname,
        position:  player.position,
        timestamp: Date.now(),
      }],
    });
  } catch(e) {
    console.error('joinConvocatoria:', e);
    alert('Error al unirse: ' + e.message);
  }
}

export async function leaveConvocatoria(convId, confirmados, uid) {
  try {
    await updateDoc(doc(db, 'convocatorias', convId), {
      confirmados: (confirmados || []).filter(p => p.uid !== uid),
    });
  } catch(e) {
    console.error('leaveConvocatoria:', e);
    alert('Error al salirse: ' + e.message);
  }
}

export async function deleteConvocatoria(convId) {
  await deleteDoc(doc(db, 'convocatorias', convId));
}
