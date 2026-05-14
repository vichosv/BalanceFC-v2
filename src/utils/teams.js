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
    const all = [...teams.A, ...teams.B, ...teams.C].sort(() => Math.random() - 0.5);
    return generate3Teams(all, mode);
  }
  const all = [...teams.A, ...teams.B].sort(() => Math.random() - 0.5);
  return generate2Teams(all, mode);
}
