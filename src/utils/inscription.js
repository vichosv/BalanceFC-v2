// Lógica de apertura de inscripción a una convocatoria:
// abre 6 días antes del partido, a las 12:00 (hora local).

export const INSCRIPTION_DAYS_BEFORE = 6;
export const INSCRIPTION_HOUR        = 12; // 12:00

// Devuelve timestamp (ms) en que se abre la inscripción, o null si no hay fecha.
export function inscriptionOpensAt(conv) {
  if (!conv?.date) return null;
  const d = new Date(`${conv.date}T${String(INSCRIPTION_HOUR).padStart(2, '0')}:00:00`);
  d.setDate(d.getDate() - INSCRIPTION_DAYS_BEFORE);
  return d.getTime();
}

export function isInscriptionOpen(conv, now = Date.now()) {
  const t = inscriptionOpensAt(conv);
  if (t == null) return true; // sin fecha = abierto
  return now >= t;
}

// "viernes 23 de mayo · 12:00"
export function fmtInscriptionOpen(conv) {
  const t = inscriptionOpensAt(conv);
  if (t == null) return '';
  const d = new Date(t);
  const date = d.toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${date} · ${hh}:${mm}`;
}
