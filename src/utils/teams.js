import { smartScore, overall, teamAvg } from './stats';

const POS_ORDER = ['GK', 'DEF', 'MID', 'WNG', 'FWD'];

function scorePlayer(p, mode) {
  return mode === 'smart' ? smartScore(p) : overall(p);
}

function groupByPos(players, mode) {
  const byPos = { GK: [], DEF: [], MID: [], WNG: [], FWD: [] };
  players.forEach(p => {
    const score = scorePlayer(p, mode);
    const clone = { ...p, score };
    (byPos[p.position] || byPos.MID).push(clone);
  });
  POS_ORDER.forEach(k => byPos[k].sort((a, b) => b.score - a.score));
  return byPos;
}

// ── 2 teams ───────────────────────────────────────────────
export function generate2Teams(players, mode = 'smart') {
  const byPos = groupByPos(players, mode);
  const A = [], B = [];
  const addBalanced = (arr) => {
    arr.forEach((p, i) => {
      const sA = A.reduce((s, x) => s + x.score, 0);
      const sB = B.reduce((s, x) => s + x.score, 0);
      if (i % 2 === 0) (sA <= sB ? A : B).push(p);
      else             (sA <= sB ? B : A).push(p);
    });
  };
  POS_ORDER.forEach(pos => addBalanced(byPos[pos]));
  while (Math.abs(A.length - B.length) > 1) {
    if (A.length > B.length) B.push(A.pop()); else A.push(B.pop());
  }
  return { A, B, avgA: teamAvg(A), avgB: teamAvg(B), triangular: false };
}

// ── 3 teams ───────────────────────────────────────────────
export function generate3Teams(players, mode = 'smart') {
  const byPos = groupByPos(players, mode);
  const A = [], B = [], C = [];
  const addBalanced3 = (arr) => {
    arr.forEach(p => {
      const sA = A.reduce((s, x) => s + x.score, 0);
      const sB = B.reduce((s, x) => s + x.score, 0);
      const sC = C.reduce((s, x) => s + x.score, 0);
      const min = Math.min(sA, sB, sC);
      if (min === sA) A.push(p); else if (min === sB) B.push(p); else C.push(p);
    });
  };
  POS_ORDER.forEach(pos => addBalanced3(byPos[pos]));
  return { A, B, C, avgA: teamAvg(A), avgB: teamAvg(B), avgC: teamAvg(C), triangular: true };
}

// ── Remix ─────────────────────────────────────────────────
export function remixTeams(teams, mode = 'smart') {
  if (teams.triangular) {
    // Perturbamos los scores para que el algoritmo greedy produzca un resultado diferente
    const all = [...teams.A, ...teams.B, ...teams.C]
      .map(p => ({ ...p, score: (p.score || overall(p)) + (Math.random() - 0.5) * 20 }))
      .sort(() => Math.random() - 0.5);
    return generate3Teams(all, mode);
  }

  // Para 2 equipos: hacemos swaps aleatorios forzados entre equipos
  let A = [...teams.A];
  let B = [...teams.B];

  // Mínimo 2 swaps, máximo la mitad del equipo más pequeño
  const minSwaps = 2;
  const maxSwaps = Math.max(minSwaps, Math.floor(Math.min(A.length, B.length) / 2));
  const numSwaps = minSwaps + Math.floor(Math.random() * (maxSwaps - minSwaps + 1));

  const usedA = new Set();
  const usedB = new Set();

  for (let i = 0; i < numSwaps; i++) {
    // Elegir índices no usados
    const availA = A.map((_, i) => i).filter(i => !usedA.has(i));
    const availB = B.map((_, i) => i).filter(i => !usedB.has(i));
    if (!availA.length || !availB.length) break;

    const idxA = availA[Math.floor(Math.random() * availA.length)];
    const idxB = availB[Math.floor(Math.random() * availB.length)];

    [A[idxA], B[idxB]] = [B[idxB], A[idxA]];
    usedA.add(idxA); usedB.add(idxB);
  }

  return { A, B, avgA: teamAvg(A), avgB: teamAvg(B), triangular: false };
}
