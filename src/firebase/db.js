import {
  doc, getDoc, setDoc, onSnapshot, collection, addDoc,
  updateDoc, deleteDoc, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from './config';

// ── Club document (players, settings) ──────────────────────
const CLUB_DOC = 'clubs/balancefc';

export function subscribeClub(callback) {
  return onSnapshot(doc(db, CLUB_DOC), snap => {
    callback(snap.exists() ? snap.data() : null);
  });
}

export async function saveClub(data) {
  await setDoc(doc(db, CLUB_DOC), data, { merge: true });
}

// ── Matches ────────────────────────────────────────────────
export function subscribeMatches(callback) {
  const q = query(collection(db, 'clubs/balancefc/matches'), orderBy('date', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function addMatch(matchData) {
  return addDoc(collection(db, 'clubs/balancefc/matches'), {
    ...matchData,
    date: serverTimestamp(),
  });
}

export async function updateMatch(id, data) {
  await updateDoc(doc(db, 'clubs/balancefc/matches', id), data);
}

export async function deleteMatch(id) {
  await deleteDoc(doc(db, 'clubs/balancefc/matches', id));
}

// ── Users / player claims ──────────────────────────────────
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveUserProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

export function subscribeUserProfile(uid, callback) {
  return onSnapshot(doc(db, 'users', uid), snap => {
    callback(snap.exists() ? snap.data() : null);
  });
}
