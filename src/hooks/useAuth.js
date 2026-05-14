import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { getUserProfile, saveUserProfile } from '../firebase/db';

export function useAuth() {
  const [user, setUser]       = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        let p = await getUserProfile(firebaseUser.uid);
        if (!p) {
          // First login — create profile
          p = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photo: firebaseUser.photoURL,
            playerId: null, // linked player profile
            isAdmin: false,
            createdAt: Date.now(),
          };
          await saveUserProfile(firebaseUser.uid, p);
        }
        setProfile(p);
      } else {
        setProfile(null);
      }
    });
    return unsub;
  }, []);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  const isAdmin  = profile?.isAdmin === true;
  const loading  = user === undefined;

  return { user, profile, isAdmin, loading, login, logout };
}
