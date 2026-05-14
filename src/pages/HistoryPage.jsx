import { useState } from 'react';
import { useMatches, logMatch } from '../hooks/useMatches';

const FORMATS = ['Libre','4v4','5v5','6v6','7v7','Triangular (6v6v6)'];
const TEAM_COLOR = { A:'var(--green)', B:'var(--blue)', C:'var(--orange)' };
const TEAM_BG    = { A:'rgba(0,230,118,.12)', B:'rgba(68,138,255,.12)', C:'rgba(255,145,0,.12)' };
const TEAM_LABEL = { A:'Equipo A', B:'Equipo B', C:'Equipo C' };

function formatDateShort(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric' });
}

// 0 = no team, A, B, C
function cycleTeam(current, triangular) {
  if (current === 0)   return 'A';
  if (current === 'A') return 'B';
  if (current === 'B') return triangular ? 'C' : 0;
  return 0;
}

export default function HistoryPage({ ctx }) {
  const { isAdmin, players = [], user } = ctx;
  const { matches, loading } = useMatches();

  const [showForm, setShowForm]   = useState(false);
  const [step,     setStep]       = useState(1); // 1=config, 2=jugadores, 3=resultado
  const [format,   setFormat]     = useState('6v6');
  const [date,     setDate]       = useState('');
  const [assign,   setAssign]     = useState({}); // uid → 'A'|'B'|'C'|0
  const [scoreA,   setScoreA]     = useState('');
  const [scoreB,   setScoreB]     = useState('');
  const [scoreC,   setScoreC]     = useState('');
  const [mvpA,     setMvpA]       = useState('');
  const [mvpB,     setMvpB]       = useState('');
  const [mvpC,     setMvpC]       = useState('');
  const [saving,   setSaving]     = useState(false);

  const triangular = format === 'Triangular (6v6v6)';
  const teamKeys   = triangular ? ['A','B','C'] : ['A','B'];

  function resetForm() {
    setStep(1); setFormat('6v6'); setDate('');
    setAssign({}); setScoreA(''); setScoreB(''); setScoreC('');
    setMvpA(''); setMvpB(''); setMvpC('');
  }

  function openForm() { resetForm(); setShowForm(true); }
  function closeForm() { setShowForm(false); }

  function toggleAssign(uid) {
    setAssign(prev => {
      const cur = prev[uid] ?? 0;
      return { ...prev, [uid]: cycleTeam(cur, triangular) };
    });
  }

  const teamOf = (key) => players.filter(p => assign[p.uid] === key);
  const countA = teamOf('A').length;
  const countB = teamOf('B').length;
  const countC = teamOf('C').length;

  function canGoStep3() {
    return countA > 0 && countB > 0 && (!triangular || countC > 0);
  }

  async function handleSubmit() {
    const sA = parseInt(scoreA);
    const sB = parseInt(scoreB);
    const sC = triangular ? parseInt(scoreC) : 0;
    if (isNaN(sA) || isNaN(sB) || (triangular && isNaN(sC))) {
      alert('Ingresa los marcadores'); return;
    }
    setSaving(true);
    try {
      await logMatch({
        date, format, triangular,
        teamA: teamOf('A').map(p => ({ uid: p.uid, nickname: p.nickname, position: p.position })),
        teamB: teamOf('B').map(p => ({ uid: p.uid, nickname: p.nickname, position: p.position })),
        teamC: triangular ? teamOf('C').map(p => ({ uid: p.uid, nickname: p.nickname, position: p.position })) : [],
        scoreA: sA, scoreB: sB, scoreC: sC,
        mvpA: mvpA || null, mvpB: mvpB || null, mvpC: mvpC || null,
        createdBy: user.uid,
      });
      closeForm();
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setSaving(false);
  }

  if (loading) return <div className="page" style={{ color:'var(--muted)' }}>Cargando...</div>;

  return (
    <div className="page">
      <div className="page-title">📊 Historial</div>

      {/* ── Botón registrar ── */}
      {isAdmin && !showForm && (
        <button className="btn btn-ac btn-full" onClick={openForm}>
          + Registrar partido
        </button>
      )}

      {/* ══ FORMULARIO ══ */}
      {showForm && (
        <div className="card" style={{ marginBottom:14 }}>

          {/* Stepper */}
          <div style={{ display:'flex', gap:4, marginBottom:16 }}>
            {['Partido','Jugadores','Resultado'].map((lbl, i) => (
              <div key={i} style={{ flex:1, textAlign:'center' }}>
                <div style={{ height:3, borderRadius:2, marginBottom:4,
                  background: step >= i + 1 ? 'var(--accent)' : 'var(--border2)',
                  transition:'background .3s' }} />
                <div style={{ fontSize:10, color: step >= i + 1 ? 'var(--accent)' : 'var(--muted)',
                  fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>{lbl}</div>
              </div>
            ))}
          </div>

          {/* ── Step 1: config ── */}
          {step === 1 && (
            <>
              <div className="grid-2" style={{ marginBottom:12 }}>
                <div>
                  <label>Fecha</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <label>Formato</label>
                  <select value={format} onChange={e => setFormat(e.target.value)}>
                    {FORMATS.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-gh" style={{ flex:1 }} onClick={closeForm}>Cancelar</button>
                <button className="btn btn-ac" style={{ flex:2 }}
                  disabled={!date} onClick={() => setStep(2)}>
                  Siguiente →
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: jugadores ── */}
          {step === 2 && (
            <>
              {/* Contadores */}
              <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                {teamKeys.map(k => (
                  <div key={k} style={{ flex:1, textAlign:'center', padding:'6px',
                    borderRadius:8, background: TEAM_BG[k],
                    border:`1px solid ${TEAM_COLOR[k]}33` }}>
                    <div style={{ fontSize:18, fontWeight:900, color: TEAM_COLOR[k] }}>{
                      k === 'A' ? countA : k === 'B' ? countB : countC
                    }</div>
                    <div style={{ fontSize:10, color: TEAM_COLOR[k], fontWeight:700 }}>{TEAM_LABEL[k]}</div>
                  </div>
                ))}
                <div style={{ flex:1, textAlign:'center', padding:'6px',
                  borderRadius:8, background:'var(--surface2)' }}>
                  <div style={{ fontSize:18, fontWeight:900, color:'var(--muted)' }}>
                    {players.length - countA - countB - countC}
                  </div>
                  <div style={{ fontSize:10, color:'var(--muted)', fontWeight:700 }}>Sin equipo</div>
                </div>
              </div>

              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8, textAlign:'center' }}>
                Toca un jugador para asignarlo → A → B{triangular ? ' → C' : ''} → sin equipo
              </div>

              {/* Chips */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(80px,1fr))',
                gap:6, marginBottom:14 }}>
                {players.map(p => {
                  const team = assign[p.uid] ?? 0;
                  const active = team !== 0;
                  return (
                    <div key={p.uid} onClick={() => toggleAssign(p.uid)}
                      style={{ padding:'7px 4px', borderRadius:10, cursor:'pointer', textAlign:'center',
                        border: `1.5px solid ${active ? TEAM_COLOR[team] : 'var(--border2)'}`,
                        background: active ? TEAM_BG[team] : 'var(--surface2)',
                        transition:'all .15s' }}>
                      <div style={{ fontSize:11, fontWeight:700,
                        color: active ? TEAM_COLOR[team] : 'var(--text)',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {p.nickname}
                      </div>
                      <div style={{ fontSize:10, color: active ? TEAM_COLOR[team] : 'var(--muted)',
                        fontWeight:700, marginTop:2 }}>
                        {active ? TEAM_LABEL[team] : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-gh" style={{ flex:1 }} onClick={() => setStep(1)}>← Volver</button>
                <button className="btn btn-ac" style={{ flex:2 }}
                  disabled={!canGoStep3()} onClick={() => setStep(3)}>
                  Siguiente →
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: resultado ── */}
          {step === 3 && (
            <>
              {teamKeys.map(k => {
                const team    = teamOf(k);
                const setScore = k === 'A' ? setScoreA : k === 'B' ? setScoreB : setScoreC;
                const score    = k === 'A' ? scoreA    : k === 'B' ? scoreB    : scoreC;
                const setMvp   = k === 'A' ? setMvpA   : k === 'B' ? setMvpB   : setMvpC;
                const mvp      = k === 'A' ? mvpA      : k === 'B' ? mvpB      : mvpC;
                return (
                  <div key={k} style={{ marginBottom:14, padding:12, borderRadius:10,
                    background: TEAM_BG[k], border:`1px solid ${TEAM_COLOR[k]}33` }}>
                    <div style={{ fontWeight:700, color: TEAM_COLOR[k], marginBottom:10, fontSize:13 }}>
                      {TEAM_LABEL[k]} — {team.map(p => p.nickname).join(', ')}
                    </div>
                    <div className="grid-2">
                      <div>
                        <label>Goles</label>
                        <input type="number" min={0} value={score}
                          onChange={e => setScore(e.target.value)}
                          style={{ borderColor: TEAM_COLOR[k] + '66' }} />
                      </div>
                      <div>
                        <label>MVP</label>
                        <select value={mvp} onChange={e => setMvp(e.target.value)}
                          style={{ borderColor: TEAM_COLOR[k] + '66' }}>
                          <option value="">— ninguno —</option>
                          {team.map(p => (
                            <option key={p.uid} value={p.uid}>{p.nickname}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-gh" style={{ flex:1 }} onClick={() => setStep(2)}>← Volver</button>
                <button className="btn btn-ac" style={{ flex:2 }}
                  disabled={saving} onClick={handleSubmit}>
                  {saving ? 'Guardando...' : '✅ Guardar partido'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ LISTA DE PARTIDOS ══ */}
      {matches.length === 0 && !showForm && (
        <div style={{ textAlign:'center', padding:'48px 0', color:'var(--muted)' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>📭</div>
          <div>No hay partidos registrados</div>
        </div>
      )}

      {matches.map(m => {
        const keys = m.triangular ? ['A','B','C'] : ['A','B'];
        const scores = { A: m.scoreA, B: m.scoreB, C: m.scoreC };
        const maxScore = Math.max(...keys.map(k => scores[k] ?? -1));
        const mvps = { A: m.mvpA, B: m.mvpB, C: m.mvpC };

        return (
          <div key={m.id} className="card" style={{ marginBottom:10 }}>
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14 }}>
                  {formatDateShort(m.createdAt)}
                </div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{m.format}</div>
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                {keys.map((k, i) => (
                  <div key={k} style={{ display:'flex', alignItems:'center', gap:4 }}>
                    {i > 0 && <span style={{ color:'var(--muted)', fontSize:13 }}>–</span>}
                    <span style={{ fontFamily:'Barlow Condensed', fontSize:28, fontWeight:900,
                      color: scores[k] === maxScore ? TEAM_COLOR[k] : 'var(--muted)',
                      lineHeight:1 }}>{scores[k]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Teams */}
            <div style={{ display:'grid', gridTemplateColumns: m.triangular ? '1fr 1fr 1fr' : '1fr 1fr', gap:8 }}>
              {keys.map(k => {
                const team = m[`team${k}`] || [];
                const mvpUid = mvps[k];
                const winner = scores[k] === maxScore;
                return (
                  <div key={k} style={{ background: TEAM_BG[k], borderRadius:8,
                    padding:'8px 10px', border:`1px solid ${TEAM_COLOR[k]}33` }}>
                    <div style={{ fontSize:10, fontWeight:700, color: TEAM_COLOR[k],
                      textTransform:'uppercase', letterSpacing:.8, marginBottom:6 }}>
                      {TEAM_LABEL[k]} {winner ? '🏆' : ''}
                    </div>
                    {team.map(p => (
                      <div key={p.uid} style={{ fontSize:12, marginBottom:3,
                        fontWeight: p.uid === mvpUid ? 700 : 400,
                        color: p.uid === mvpUid ? TEAM_COLOR[k] : 'var(--text)' }}>
                        {p.uid === mvpUid ? '⭐ ' : ''}{p.nickname}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
