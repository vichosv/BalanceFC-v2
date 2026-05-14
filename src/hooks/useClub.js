import { useState, useEffect } from 'react';
import { subscribeClub, saveClub } from '../firebase/db';

const DEFAULT_CLUB = {
  players: [],
  convocatoria: null,
};

export function useClub() {
  const [club, setClub]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeClub(data => {
      setClub(data ?? DEFAULT_CLUB);
      setLoading(false);
    });
    return unsub;
  }, []);

  const updateClub = (data) => saveClub(data);

  return { club, loading, updateClub };
}
