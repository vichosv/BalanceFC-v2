import { useState } from 'react';
import { useMatches, logMatch }         from '../hooks/useMatches';
import { useSeasons, createSeason, closeSeason } from '../hooks/useSeasons';
import { overall } from '../utils/stats';

const FORMATS    = ['Libre','4v4','5v5','6v6','7v7','Triangular (6v6v6)'];
const TEAM_COLOR = { A:'var(--green)', B:'var(--blue)', C:'var(--orange)' };
const TEAM_BG    = { A:'rgba(0,230,118,.12)', B:'rgba(68,138,255,.12)', C:'rgba(255,145,0,.12)' };
const TEAM_LABEL = { A:'Equipo A', B:'Equipo B', C:'Equipo C' };

function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric' });
}

function cycleTeam(cur, tri) {
  if (cur === 0)   return 'A';
  if (cur === 'A') return 'B';
  if (cur === 'B') return tri ? 'C' : 0;
  return 0;
}

function seasonPts(p, sid) {
  const s  = p.seasons?.[sid] || {};
  const pj = s.matches || 0;
  if (!pj) return 0;
  const wr  = (s.wins    || 0) / pj;
  const gpm = (s.goals   || 0) / pj;
  const apm = (s.assists || 0) / pj;
  return Math.round(wr * 50 + gpm * 25 + apm * 15 + pj * 2);
}

// ── Counter control ───────────────────────────────────────────
function Counter({ value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <button onClick={() => onChange(Math.max(0, value - 1))}
        style={{ width:24, height:24, borderRadius:6, border:'1px solid var(--border2)',
          background:'var(--surface2)', color:'var(--text)', cursor:'pointer', fontSize:14,
          display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
      <span style={{ width:18, textAlign:'center', fontWeight:700, fontSize:14 }}>{value}</span>
      <button onClick={() => onChange(value + 1)}
        style={{ width:24, height:24, borderRadius:6, border:'1px solid var(--border2)',
          background:'var(--surface2)', color:'var(--text)', cursor:'pointer', fontSize:14,
          display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export default function HistoryPage({ ctx }) {
  const { isAdmin, players = [], user } = ctx;
  const { matches, loading: lM } = useMatches();
  const { seasons, activeSeason, loading: lS } = useSeasons();

  const [tab, setTab] = useState('historial');

  // ── Season form ──
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [seasonName,     setSeasonName]     = useState('');
  const [savingSeason,   setSavingSeason]   = useState(false);

  // ── Match form ──
  const [showForm,  setShowForm]  = useState(false);
  const [step,      setStep]      = useState(1);
  const [format,    setFormat]    = useState('6v6');
  const [date,      setDate]      = useState('');
  const [assign,    setAssign]    = useState({});       // uid → 'A'|'B'|'C'|0
  const [scoreA,    setScoreA]    = useState('');
  const [scoreB,    setScoreB]    = useState('');
  const [scoreC,    setScoreC]    = useState('');
  const [pStats,    setPStats]    = useState({});       // uid → { goals, assists }
  const [saving,    setSaving]    = useState(false);

  const tri      = format === 'Triangular (6v6v6)';
  const teamKeys = tri ? ['A','B','C'] : ['A','B'];

  // ── Helpers ──
  const teamOf  = k => players.filter(p => assign[p.uid] === k);
  const countA  = teamOf('A').length;
  const countB  = teamOf('B').length;
  const countC  = teamOf('C').length;
  const canStep3 = countA > 0 && countB > 0 && (!tri || countC > 0);

  function resetForm() {
    setStep(1); setFormat('6v6'); setDate('');
    setAssign({}); setScoreA(''); setScoreB(''); setScoreC(''); setPStats({});
  }

  function toggleAssign(uid) {
    setAssign(prev => ({ ...prev, [uid]: cycleTeam(prev[uid] ?? 0, tri) }));
  }

  function setStat(uid, field, val) {
    setPStats(prev => ({ ...prev, [uid]: { ...(prev[uid] || { goals:0, assists:0 }), [field]: val } }));
  }

  // ── Season actions ──
  async function handleCreateSeason() {
    if (!seasonName.trim()) return;
    setSavingSeason(true);
    await createSeason(seasonName.trim(), user.uid);
    setSeasonName(''); setShowSeasonForm(false); setSavingSeason(false);
  }

  // ── Submit match ──
  async function handleSubmit() {
    const sA = parseInt(scoreA), sB = parseInt(scoreB);
    const sC = tri ? parseInt(scoreC) : 0;
    if (isNaN(sA) || isNaN(sB) || (tri && isNaN(sC))) { alert('Ingresa los marcadores'); return; }
    setSaving(true);
    try {
      await logMatch({
        date, format, triangular: tri,
        seasonId: activeSeason?.id || null,
        teamA: teamOf('A').map(p => ({ uid:p.uid, nickname:p.nickname, position:p.position })),
        teamB: teamOf('B').map(p => ({ uid:p.uid, nickname:p.nickname, position:p.position })),
        teamC: tri ? teamOf('C').map(p => ({ uid:p.uid, nickname:p.nickname, position:p.position })) : [],
        scoreA: sA, scoreB: sB, scoreC: sC,
        playerStats: pStats,
        createdBy: user.uid,
      });
      resetForm(); setShowForm(false);
    } catch(e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  if (lM || lS) return <div className="page" style={{ color:'var(--muted)' }}>Cargando...</div>;

  // ── Rankings ──
  const sid = activeSeason?.id;
  const rankSeason = sid
    ? [...players]
        .filter(p => (p.seasons?.[sid]?.matches || 0) > 0)
        .sort((a, b) => seasonPts(b, sid) - seasonPts(a, sid))
    : [];
  const rankGlobal = [...players]
    .filter(p => (p.history?.matches || 0) > 0)
    .sort((a, b) => {
      const pts = p => {
        const pj = p.history?.matches || 0;
        if (!pj) return 0;
        const wr  = (p.history?.wins    || 0) / pj;
        const gpm = (p.history?.goals   || 0) / pj;
        const apm = (p.history?.assists || 0) / pj;
        return Math.round(wr * 50 + gpm * 25 + apm * 15 + pj * 2);
      };
      return pts(b) - pts(a);
    });

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="page-title">📊 Historial</div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:4, marginBottom:14, background:'var(--surface2)',
        borderRadius:10, padding:4 }}>
        {[
          { id:'historial', label:'⚽ Partidos'  },
          { id:'ranking',   label:'🏆 Ranking'   },
          { id:'temporada', label:'📅 Temporada' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, padding:'7px 4px', borderRadius:8, border:'none', cursor:'pointer',
              fontWeight:700, fontSize:12, transition:'all .15s',
              background: tab === t.id ? 'var(--surface)' : 'transparent',
              color:      tab === t.id ? 'var(--accent)'  : 'var(--muted)',
              boxShadow:  tab === t.id ? '0 1px 4px rgba(0,0,0,.3)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ TAB: PARTIDOS ══════════ */}
      {tab === 'historial' && (
        <>
          {activeSeason && (
            <div style={{ fontSize:12, color:'var(--accent)', fontWeight:600,
              marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:7, height:7, borderRadius:'50%',
                background:'var(--accent)', display:'inline-block' }} />
              {activeSeason.name}
            </div>
          )}

          {isAdmin && !showForm && (
            <button className="btn btn-ac btn-full" onClick={() => { resetForm(); setShowForm(true); }}>
              + Registrar partido
            </button>
          )}

          {/* Form */}
          {showForm && (
            <div className="card" style={{ marginBottom:14 }}>
              {/* Stepper */}
              <div style={{ display:'flex', gap:4, marginBottom:16 }}>
                {['Partido','Jugadores','Resultado'].map((lbl, i) => (
                  <div key={i} style={{ flex:1, textAlign:'center' }}>
                    <div style={{ height:3, borderRadius:2, marginBottom:4, transition:'background .3s',
                      background: step >= i+1 ? 'var(--accent)' : 'var(--border2)' }} />
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5,
                      color: step >= i+1 ? 'var(--accent)' : 'var(--muted)' }}>{lbl}</div>
                  </div>
                ))}
              </div>

              {/* Step 1: config */}
              {step === 1 && (
                <>
                  <div className="grid-2" style={{ marginBottom:12 }}>
                    <div><label>Fecha</label>
                      <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div><label>Formato</label>
                      <select value={format} onChange={e => setFormat(e.target.value)}>
                        {FORMATS.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                  {activeSeason && (
                    <div style={{ fontSize:11, color:'var(--accent)', marginBottom:10 }}>
                      Temporada: {activeSeason.name}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-gh" style={{ flex:1 }}
                      onClick={() => setShowForm(false)}>Cancelar</button>
                    <button className="btn btn-ac" style={{ flex:2 }}
                      disabled={!date} onClick={() => setStep(2)}>Siguiente →</button>
                  </div>
                </>
              )}

              {/* Step 2: jugadores */}
              {step === 2 && (
                <>
                  <div style={{ display:'flex', gap:6, marginBottom:12 }}>
                    {teamKeys.map(k => (
                      <div key={k} style={{ flex:1, textAlign:'center', padding:'6px', borderRadius:8,
                        background:TEAM_BG[k], border:`1px solid ${TEAM_COLOR[k]}33` }}>
                        <div style={{ fontSize:18, fontWeight:900, color:TEAM_COLOR[k] }}>
                          {k==='A'?countA:k==='B'?countB:countC}
                        </div>
                        <div style={{ fontSize:10, color:TEAM_COLOR[k], fontWeight:700 }}>{TEAM_LABEL[k]}</div>
                      </div>
                    ))}
                    <div style={{ flex:1, textAlign:'center', padding:'6px', borderRadius:8, background:'var(--surface2)' }}>
                      <div style={{ fontSize:18, fontWeight:900, color:'var(--muted)' }}>
                        {players.length - countA - countB - countC}
                      </div>
                      <div style={{ fontSize:10, color:'var(--muted)', fontWeight:700 }}>—</div>
                    </div>
                  </div>

                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8, textAlign:'center' }}>
                    Toca para asignar → A → B{tri?' → C':''} → sin equipo
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(82px,1fr))',
                    gap:6, marginBottom:14 }}>
                    {players.map(p => {
                      const team   = assign[p.uid] ?? 0;
                      const active = team !== 0;
                      return (
                        <div key={p.uid} onClick={() => toggleAssign(p.uid)}
                          style={{ padding:'7px 4px', borderRadius:10, cursor:'pointer', textAlign:'center',
                            border:`1.5px solid ${active ? TEAM_COLOR[team] : 'var(--border2)'}`,
                            background: active ? TEAM_BG[team] : 'var(--surface2)', transition:'all .15s' }}>
                          <div style={{ fontSize:11, fontWeight:700, overflow:'hidden',
                            textOverflow:'ellipsis', whiteSpace:'nowrap',
                            color: active ? TEAM_COLOR[team] : 'var(--text)' }}>{p.nickname}</div>
                          <div style={{ fontSize:10, fontWeight:700, marginTop:2,
                            color: active ? TEAM_COLOR[team] : 'var(--muted)' }}>
                            {active ? TEAM_LABEL[team] : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-gh" style={{ flex:1 }} onClick={() => setStep(1)}>← Volver</button>
                    <button className="btn btn-ac" style={{ flex:2 }}
                      disabled={!canStep3} onClick={() => setStep(3)}>Siguiente →</button>
                  </div>
                </>
              )}

              {/* Step 3: resultado */}
              {step === 3 && (
                <>
                  {/* Marcadores */}
                  <div style={{ display:'flex', justifyContent:'center', alignItems:'center',
                    gap:12, marginBottom:16 }}>
                    {teamKeys.map((k, i) => {
                      const setScore = k==='A'?setScoreA:k==='B'?setScoreB:setScoreC;
                      const score    = k==='A'?scoreA:k==='B'?scoreB:scoreC;
                      return (
                        <div key={k} style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {i > 0 && <span style={{ color:'var(--muted)', fontSize:20, fontWeight:700 }}>–</span>}
                          <div style={{ textAlign:'center' }}>
                            <div style={{ fontSize:10, color:TEAM_COLOR[k], fontWeight:700,
                              textTransform:'uppercase', marginBottom:4 }}>{TEAM_LABEL[k]}</div>
                            <input type="number" min={0} value={score}
                              onChange={e => setScore(e.target.value)}
                              style={{ width:64, textAlign:'center', fontSize:24, fontWeight:900,
                                borderColor:TEAM_COLOR[k]+'88', color:TEAM_COLOR[k] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Goles y asistencias por jugador */}
                  {teamKeys.map(k => {
                    const team = teamOf(k);
                    if (!team.length) return null;
                    return (
                      <div key={k} style={{ marginBottom:12, borderRadius:10, overflow:'hidden',
                        border:`1px solid ${TEAM_COLOR[k]}33` }}>
                        <div style={{ padding:'7px 12px', background:TEAM_BG[k],
                          fontSize:11, fontWeight:700, color:TEAM_COLOR[k],
                          textTransform:'uppercase', letterSpacing:.8 }}>
                          {TEAM_LABEL[k]}
                        </div>
                        <div style={{ background:'var(--surface2)' }}>
                          {/* Header */}
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px',
                            padding:'5px 12px', borderBottom:'1px solid var(--border)',
                            fontSize:10, color:'var(--muted)', fontWeight:700, textTransform:'uppercase' }}>
                            <span>Jugador</span><span style={{ textAlign:'center' }}>Goles</span>
                            <span style={{ textAlign:'center' }}>Asist.</span>
                          </div>
                          {team.map(p => {
                            const ps = pStats[p.uid] || { goals:0, assists:0 };
                            return (
                              <div key={p.uid} style={{ display:'grid',
                                gridTemplateColumns:'1fr 80px 80px',
                                padding:'7px 12px', alignItems:'center',
                                borderBottom:'1px solid var(--border)' }}>
                                <span style={{ fontSize:13, fontWeight:600 }}>{p.nickname}</span>
                                <div style={{ display:'flex', justifyContent:'center' }}>
                                  <Counter value={ps.goals}
                                    onChange={v => setStat(p.uid, 'goals', v)} />
                                </div>
                                <div style={{ display:'flex', justifyContent:'center' }}>
                                  <Counter value={ps.assists}
                                    onChange={v => setStat(p.uid, 'assists', v)} />
                                </div>
                              </div>
                            );
                          })}
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

          {/* Lista partidos */}
          {matches.length === 0 && !showForm && (
            <div style={{ textAlign:'center', padding:'48px 0', color:'var(--muted)' }}>
              <div style={{ fontSize:40, marginBottom:8 }}>📭</div>
              <div>No hay partidos registrados</div>
            </div>
          )}

          {matches.map(m => {
            const keys     = m.triangular ? ['A','B','C'] : ['A','B'];
            const scores   = { A:m.scoreA, B:m.scoreB, C:m.scoreC };
            const maxScore = Math.max(...keys.map(k => scores[k] ?? -1));
            const ps       = m.playerStats || {};

            return (
              <div key={m.id} className="card" style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{fmtDate(m.createdAt)}</div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{m.format}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    {keys.map((k, i) => (
                      <div key={k} style={{ display:'flex', alignItems:'center', gap:4 }}>
                        {i > 0 && <span style={{ color:'var(--muted)', fontSize:13 }}>–</span>}
                        <span style={{ fontFamily:'Barlow Condensed', fontSize:28,
                          fontWeight:900, lineHeight:1,
                          color: scores[k] === maxScore ? TEAM_COLOR[k] : 'var(--muted)' }}>
                          {scores[k]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display:'grid',
                  gridTemplateColumns: m.triangular ? '1fr 1fr 1fr' : '1fr 1fr', gap:8 }}>
                  {keys.map(k => {
                    const team   = m[`team${k}`] || [];
                    const winner = scores[k] === maxScore;
                    return (
                      <div key={k} style={{ background:TEAM_BG[k], borderRadius:8,
                        padding:'8px 10px', border:`1px solid ${TEAM_COLOR[k]}33` }}>
                        <div style={{ fontSize:10, fontWeight:700, color:TEAM_COLOR[k],
                          textTransform:'uppercase', letterSpacing:.8, marginBottom:6 }}>
                          {TEAM_LABEL[k]} {winner ? '🏆' : ''}
                        </div>
                        {team.map(p => {
                          const g = ps[p.uid]?.goals   || 0;
                          const a = ps[p.uid]?.assists || 0;
                          return (
                            <div key={p.uid} style={{ display:'flex', justifyContent:'space-between',
                              alignItems:'center', fontSize:12, marginBottom:3 }}>
                              <span style={{ color:'var(--text)' }}>{p.nickname}</span>
                              {(g > 0 || a > 0) && (
                                <span style={{ fontSize:10, color:TEAM_COLOR[k], fontWeight:700 }}>
                                  {g > 0 ? `${g}G` : ''}{g > 0 && a > 0 ? ' ' : ''}{a > 0 ? `${a}A` : ''}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ══════════ TAB: RANKING ══════════ */}
      {tab === 'ranking' && (
        <>
          {/* Ranking temporada activa */}
          {activeSeason && (
            <div className="card" style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--accent)',
                textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>
                {activeSeason.name}
              </div>
              {rankSeason.length === 0 ? (
                <div style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:'12px 0' }}>
                  Aún no hay partidos en esta temporada
                </div>
              ) : rankSeason.map((p, i) => <RankRow key={p.uid} p={p} i={i}
                  stats={p.seasons?.[sid] || {}} pts={seasonPts(p, sid)} />)
              }
            </div>
          )}

          {/* Ranking global */}
          <div className="card">
            <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
              textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>
              Global — todos los partidos
            </div>
            {rankGlobal.length === 0 ? (
              <div style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:'12px 0' }}>
                Aún no hay partidos registrados
              </div>
            ) : rankGlobal.map((p, i) => {
              const h   = p.history || {};
              const pj  = h.matches || 0;
              const wr  = pj ? (h.wins || 0) / pj : 0;
              const gpm = pj ? (h.goals || 0) / pj : 0;
              const apm = pj ? (h.assists || 0) / pj : 0;
              const pts = Math.round(wr * 50 + gpm * 25 + apm * 15 + pj * 2);
              return <RankRow key={p.uid} p={p} i={i} stats={h} pts={pts} />;
            })}
          </div>
        </>
      )}

      {/* ══════════ TAB: TEMPORADA ══════════ */}
      {tab === 'temporada' && (
        <>
          {activeSeason ? (
            <div className="card" style={{ marginBottom:12,
              border:'1px solid rgba(0,229,255,.25)', background:'rgba(0,229,255,.05)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--accent)', fontWeight:700,
                    textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Temporada activa</div>
                  <div style={{ fontWeight:700, fontSize:16 }}>{activeSeason.name}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                    Desde {fmtDate(activeSeason.createdAt)}
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => window.confirm('¿Cerrar esta temporada?') && closeSeason(activeSeason.id)}
                    style={{ padding:'7px 12px', borderRadius:8,
                      border:'1px solid rgba(255,82,82,.3)', background:'rgba(255,82,82,.08)',
                      color:'var(--red)', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'16px 0 12px', color:'var(--muted)', fontSize:13 }}>
              No hay temporada activa
            </div>
          )}

          {isAdmin && !activeSeason && (
            !showSeasonForm ? (
              <button className="btn btn-ac btn-full" onClick={() => setShowSeasonForm(true)}>
                + Nueva temporada
              </button>
            ) : (
              <div className="card" style={{ marginBottom:12 }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>Nueva temporada</div>
                <div style={{ marginBottom:12 }}>
                  <label>Nombre</label>
                  <input placeholder="ej: Temporada 1 — 2026"
                    value={seasonName} onChange={e => setSeasonName(e.target.value)} />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-gh" style={{ flex:1 }}
                    onClick={() => setShowSeasonForm(false)}>Cancelar</button>
                  <button className="btn btn-ac" style={{ flex:2 }}
                    disabled={!seasonName.trim() || savingSeason} onClick={handleCreateSeason}>
                    {savingSeason ? 'Creando...' : 'Crear'}
                  </button>
                </div>
              </div>
            )
          )}

          {seasons.filter(s => s.status === 'closed').length > 0 && (
            <div style={{ marginTop:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
                textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                Temporadas anteriores
              </div>
              {seasons.filter(s => s.status === 'closed').map(s => (
                <div key={s.id} className="card" style={{ padding:'10px 14px', marginBottom:8 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{s.name}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                    {fmtDate(s.createdAt)} → {fmtDate(s.closedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Ranking row ───────────────────────────────────────────────
function RankRow({ p, i, stats, pts }) {
  const pj  = stats.matches  || 0;
  const v   = stats.wins     || 0;
  const g   = stats.goals    || 0;
  const a   = stats.assists  || 0;
  const wr  = pj ? Math.round(v / pj * 100) : 0;
  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0',
      borderBottom:'1px solid var(--border)' }}>
      <div style={{ width:28, textAlign:'center', fontFamily:'Barlow Condensed',
        fontSize: medal ? 20 : 14, fontWeight:700,
        color: i < 3 ? 'var(--yellow)' : 'var(--muted)' }}>
        {medal || `${i + 1}`}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:700, fontSize:14 }}>{p.nickname}</div>
        <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>
          {pj}PJ · {v}V · {g}G · {a}A · {wr}%WR
        </div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontFamily:'Barlow Condensed', fontSize:22,
          fontWeight:900, color:'var(--accent)' }}>{pts}</div>
        <div style={{ fontSize:9, color:'var(--muted)', letterSpacing:.5 }}>PTS</div>
      </div>
    </div>
  );
}
