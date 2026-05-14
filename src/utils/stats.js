// ── Stat keys ──────────────────────────────────────────────
export const SK = [
  { key:'vel', label:'Velocidad',  emoji:'⚡', color:'#00e676', chip:'sc-vel', cls:'rv', desc:'Velocidad y sprint' },
  { key:'tec', label:'Técnica',    emoji:'🎯', color:'#ffd740', chip:'sc-tec', cls:'rt', desc:'Control y pase' },
  { key:'def', label:'Defensa',    emoji:'🛡️', color:'#448aff', chip:'sc-def', cls:'rd', desc:'Marca y posición' },
  { key:'tir', label:'Tiro',       emoji:'💥', color:'#ff5252', chip:'sc-tir', cls:'rti',desc:'Potencia y precisión' },
  { key:'sta', label:'Resistencia',emoji:'🫀', color:'#ff9100', chip:'sc-sta', cls:'rs', desc:'Aguante físico' },
  { key:'fis', label:'Físico',     emoji:'💪', color:'#c47eff', chip:'sc-fis', cls:'rf', desc:'Fuerza e impacto' },
];

// ── Overall ────────────────────────────────────────────────
export const overall = (p) =>
  Math.round(SK.reduce((s, sk) => s + (p[sk.key] || 50), 0) / SK.length);

// ── Smart score (position-weighted) ───────────────────────
const W = {
  GK:  { vel:0.8, tec:0.7, def:1.5, tir:0.6, sta:1.0, fis:1.4 },
  DEF: { vel:1.0, tec:0.9, def:1.5, tir:0.7, sta:1.1, fis:1.3 },
  MID: { vel:1.1, tec:1.4, def:1.0, tir:1.0, sta:1.2, fis:0.8 },
  WNG: { vel:1.5, tec:1.3, def:0.7, tir:1.1, sta:1.1, fis:0.8 },
  FWD: { vel:1.3, tec:1.2, def:0.6, tir:1.5, sta:1.0, fis:0.9 },
};
export const smartScore = (p) => {
  const w = W[p.position] || W.MID;
  const raw = SK.reduce((s, sk) => s + (p[sk.key] || 50) * (w[sk.key] || 1), 0) / SK.length;
  return Math.round(raw * 10) / 10;
};

// ── Tier ──────────────────────────────────────────────────
export const tier = (ov) => {
  if (ov >= 90) return 'legend';
  if (ov >= 82) return 'diamond';
  if (ov >= 74) return 'ruby';
  if (ov >= 66) return 'sapphire';
  if (ov >= 58) return 'emerald';
  if (ov >= 50) return 'gold';
  if (ov >= 42) return 'silver';
  if (ov >= 34) return 'bronze';
  return 'iron';
};

// ── Win rate ───────────────────────────────────────────────
export const winRate = (p) => {
  if (!p.history?.matches) return 0;
  return Math.round((p.history.wins / p.history.matches) * 100);
};

// ── Rank score ────────────────────────────────────────────
export const rankScore = (p) => {
  const pj   = p.history?.matches || 0;
  if (!pj) return 0;
  const wr   = winRate(p) / 100;
  const goals = p.history?.goals || 0;
  const mvps  = p.history?.mvps  || 0;
  const gpm   = Math.min(goals / pj, 1.25);
  return Math.round(
    wr   * 25 +
    gpm  * 28 +
    (mvps / pj) * 22 +
    overall(p)  * 0.25
  );
};

// ── Player avatar initials ────────────────────────────────
export const initials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

// ── Unique id ─────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 10);

// ── Team average ─────────────────────────────────────────
export const teamAvg = (team) =>
  team.length ? team.reduce((s, p) => s + (p.score || overall(p)), 0) / team.length : 0;
