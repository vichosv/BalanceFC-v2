import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const DUMMY_PLAYERS = [
  { uid:'dummy-01', nickname:'Cata',    position:'GK',  vel:60, tec:62, def:72, tir:55, sta:65, fis:70, emoji:'🧤' },
  { uid:'dummy-02', nickname:'Nacho',   position:'DEF', vel:65, tec:60, def:78, tir:52, sta:70, fis:75, emoji:'🛡️' },
  { uid:'dummy-03', nickname:'Mono',    position:'DEF', vel:68, tec:63, def:75, tir:55, sta:68, fis:72, emoji:'💪' },
  { uid:'dummy-04', nickname:'Pipe',    position:'MID', vel:72, tec:78, def:62, tir:68, sta:74, fis:60, emoji:'⚙️' },
  { uid:'dummy-05', nickname:'Chino',   position:'MID', vel:70, tec:75, def:60, tir:70, sta:72, fis:58, emoji:'🎮' },
  { uid:'dummy-06', nickname:'Turco',   position:'MID', vel:66, tec:72, def:65, tir:65, sta:76, fis:63, emoji:'⚽' },
  { uid:'dummy-07', nickname:'Felo',    position:'WNG', vel:84, tec:76, def:52, tir:72, sta:78, fis:60, emoji:'⚡' },
  { uid:'dummy-08', nickname:'Pato',    position:'WNG', vel:80, tec:74, def:55, tir:70, sta:75, fis:58, emoji:'🦆' },
  { uid:'dummy-09', nickname:'Toro',    position:'FWD', vel:74, tec:72, def:50, tir:82, sta:70, fis:78, emoji:'🐂' },
  { uid:'dummy-10', nickname:'Pepe',    position:'FWD', vel:76, tec:74, def:48, tir:80, sta:68, fis:72, emoji:'🎯' },
  { uid:'dummy-11', nickname:'Maxi',    position:'FWD', vel:78, tec:70, def:45, tir:84, sta:66, fis:70, emoji:'🔥' },
];

export async function seedDummyPlayers() {
  await Promise.all(
    DUMMY_PLAYERS.map(p =>
      setDoc(doc(db, 'players', p.uid), {
        ...p,
        photo:     null,
        photos:    [],
        logros:    [],
        history:   { matches: 0, wins: 0, goals: 0, mvps: 0 },
        createdAt: Date.now(),
        isDummy:   true,
      })
    )
  );
}
