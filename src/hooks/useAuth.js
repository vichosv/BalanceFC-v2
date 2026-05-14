import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';

export function useAuth() {
  const [user,    setUser]    = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let profileUnsub = null;

    const authUnsub = onAuthStateChanged(auth, firebaseUser => {
      setUser(firebaseUser);
      if (profileUnsub) { profileUnsub(); profileUnsub = null; }

      if (firebaseUser) {
        // Real-time subscription to user doc
        profileUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), snap => {
          setProfile(snap.exists() ? snap.data() : null);
        });
      } else {
        setProfile(null);
      }
    });

    return () => { authUnsub(); if (profileUnsub) profileUnsub(); };
  }, []);

  const login  = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  const isAdmin    = profile?.isAdmin    === true;
  const onboarded  = profile?.onboarded  === true;
  const loading    = user === undefined;

  return { user, profile, isAdmin, onboarded, loading, login, logout };
}
