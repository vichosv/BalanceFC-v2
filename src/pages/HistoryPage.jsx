import { useState } from 'react';
import { useMatches, logMatch } from '../hooks/useMatches';
import { useSeasons, createSeason, closeSeason } from '../hooks/useSeasons';

const FORMATS = ['Libre','4v4','5v5','6v6','7v7','Triangular (6v6v6)'];
const TEAM_COLOR = { A:'var(--green)', B:'var(--blue)', C:'var(--orange)' };
const TEAM_BG    = { A:'rgba(0,230,118,.12)', B:'rgba(68,138,255,.12)', C:'rgba(255,145,0,.12)' };
const TEAM_LABEL = { A:'Equipo A', B:'Equipo B', C:'Equipo C' };

function formatDateShort(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric' });
}

function cycleTeam(current, triangular) {
  if (current === 0)   return 'A';
  if (current === 'A') return 'B';
  if (current === 'B') return triangular ? 'C' : 0;
  return 0;
}

function seasonRank(p, sid) {
  const s = p.seasons?.[sid] || {};
  const pj  = s.matches || 0;
  if (!pj) return 0;
  const wr  = (s.wins || 0) / pj;
  const mpm = (s.mvps || 0) / pj;
  return Math.round(wr * 50 + mpm * 30 + pj * 2);
}

// ─────────────────────────────────────────────────────────────
export default function HistoryPage({ ctx }) {
  const { isAdmin, players = [], user } = ctx;
  const { matches, loading: loadingM }  = useMatches();
  const { seasons, activeSeason, loading: loadingS } = useSeasons();

  const [tab, setTab] = useState('partidos'); // 'partidos' | 'temporada'

  // ── Season form ──
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [seasonName,     setSeasonName]     = useState('');
  const [savingSeason,   setSavingSeason]   = useState(false);

  // ── Match form ──
  const [showForm, setShowForm]   = useState(false);
  const [step,     setStep]       = useState(1);
  const [format,   setFormat]     = useState('6v6');
  const [date,     setDate]       = useState('');
  const [assign,   setAssign]     = useState({});
  const [scoreA,   setScoreA]     = useState('');
  const [scoreB,   setScoreB]     = useState('');
  const [scoreC,   setScoreC]     = useState('');
  const [mvpA,     setMvpA]       = useState('');
  const [mvpB,     setMvpB]       = useState('');
  const [mvpC,     setMvpC]       = useState('');
  const [saving,   setSaving]     = useState(false);

  const triangular = format === 'Triangular (6v6v6)';
  const teamKeys   = triangular ? ['A','B','C'] : ['A','B'];

  // ── Season actions ──
  async function handleCreateSeason() {
    if (!seasonName.trim()) return;
    setSavingSeason(true);
    await createSeason(seasonName.trim(), user.uid);
    setSeasonName(''); setShowSeasonForm(false); setSavingSeason(false);
  }

  // ── Match form helpers ──
  function resetForm() {
    setStep(1); setFormat('6v6'); setDate('');
    setAssign({}); setScoreA(''); setScoreB(''); setScoreC('');
    setMvpA(''); setMvpB(''); setMvpC('');
  }
  function openForm()  { resetForm(); setShowForm(true); }
  function closeForm() { setShowForm(false); }

  function toggleAssign(uid) {
    setAssign(prev => ({ ...prev, [uid]: cycleTeam(prev[uid] ?? 0, triangular) }));
  }

  const teamOf  = k => players.filter(p => assign[p.uid] === k);
  const countA  = teamOf('A').length;
  const countB  = teamOf('B').length;
  const countC  = teamOf('C').length;
  const canStep3 = countA > 0 && countB > 0 && (!triangular || countC > 0);

  async function handleSubmit() {
    const sA = parseInt(scoreA), sB = parseInt(scoreB);
    const sC = triangular ? parseInt(scoreC) : 0;
    if (isNaN(sA) || isNaN(sB) || (triangular && isNaN(sC))) {
      alert('Ingresa los marcadores'); return;
    }
    setSaving(true);
    try {
      await logMatch({
        date, format, triangular,
        seasonId: activeSeason?.id || null,
        teamA: teamOf('A').map(p => ({ uid:p.uid, nickname:p.nickname, position:p.position })),
        teamB: teamOf('B').map(p => ({ uid:p.uid, nickname:p.nickname, position:p.position })),
        teamC: triangular ? teamOf('C').map(p => ({ uid:p.uid, nickname:p.nickname, position:p.position })) : [],
        scoreA: sA, scoreB: sB, scoreC: sC,
        mvpA: mvpA||null, mvpB: mvpB||null, mvpC: mvpC||null,
        createdBy: user.uid,
      });
      closeForm();
    } catch(e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  if (loadingM || loadingS) return <div className="page" style={{ color:'var(--muted)' }}>Cargando...</div>;

  // ── Ranking for active season ──
  const ranked = activeSeason
    ? [...players]
        .filter(p => (p.seasons?.[activeSeason.id]?.matches || 0) > 0)
        .sort((a, b) => seasonRank(b, activeSeason.id) - seasonRank(a, activeSeason.id))
    : [];

  return (
    <div className="page">
      <div className="page-title">📊 Historial</div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:4, marginBottom:14, background:'var(--surface2)',
        borderRadius:10, padding:4 }}>
        {['partidos','temporada'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex:1, padding:'8px', borderRadius:8, border:'none', cursor:'pointer',
              fontWeight:700, fontSize:13, transition:'all .15s',
              background: tab === t ? 'var(--surface)' : 'transparent',
              color: tab === t ? 'var(--accent)' : 'var(--muted)',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.3)' : 'none' }}>
            {t === 'partidos' ? '⚽ Partidos' : '🏆 Temporada'}
          </button>
        ))}
      </div>

      {/* ══════════════ TAB: TEMPORADA ══════════════ */}
      {tab === 'temporada' && (
        <>
          {/* Temporada activa */}
          {activeSeason ? (
            <div className="card" style={{ marginBottom:12,
              border:'1px solid rgba(0,229,255,.25)', background:'rgba(0,229,255,.05)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--accent)', fontWeight:700,
                    textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Temporada activa</div>
                  <div style={{ fontWeight:700, fontSize:16 }}>{activeSeason.name}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                    Desde {formatDateShort(activeSeason.createdAt)}
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => window.confirm('¿Cerrar esta temporada?') && closeSeason(activeSeason.id)}
                    style={{ padding:'7px 12px', borderRadius:8, border:'1px solid rgba(255,82,82,.3)',
                      background:'rgba(255,82,82,.08)', color:'var(--red)', cursor:'pointer',
                      fontSize:12, fontWeight:700 }}>
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'20px 0 12px', color:'var(--muted)', fontSize:13 }}>
              No hay temporada activa
            </div>
          )}

          {/* Admin: crear temporada */}
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

          {/* Ranking */}
          {activeSeason && (
            <div className="card">
              <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
                textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>
                Ranking — {activeSeason.name}
              </div>

              {ranked.length === 0 ? (
                <div style={{ textAlign:'center', padding:'20px 0', color:'var(--muted)', fontSize:13 }}>
                  Aún no hay partidos en esta temporada
                </div>
              ) : (
                ranked.map((p, i) => {
                  const s   = p.seasons?.[activeSeason.id] || {};
                  const pj  = s.matches || 0;
                  const v   = s.wins    || 0;
                  const mvp = s.mvps    || 0;
                  const wr  = pj ? Math.round(v / pj * 100) : 0;
                  const pts = seasonRank(p, activeSeason.id);
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;

                  return (
                    <div key={p.uid} style={{ display:'flex', alignItems:'center', gap:10,
                      padding:'8px 0', borderBottom: i < ranked.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ width:28, textAlign:'center', fontFamily:'Barlow Condensed',
                        fontSize: medal ? 20 : 14, fontWeight:700,
                        color: i < 3 ? 'var(--yellow)' : 'var(--muted)' }}>
                        {medal || `${i + 1}`}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14 }}>{p.nickname}</div>
                        <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>
                          {pj} PJ · {v} V · {mvp} MVP · {wr}% WR
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:'Barlow Condensed', fontSize:22,
                          fontWeight:900, color:'var(--accent)' }}>{pts}</div>
                        <div style={{ fontSize:9, color:'var(--muted)', letterSpacing:.5 }}>PTS</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Temporadas anteriores */}
          {seasons.filter(s => s.status === 'closed').length > 0 && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
                textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                Temporadas anteriores
              </div>
              {seasons.filter(s => s.status === 'closed').map(s => (
                <div key={s.id} className="card" style={{ padding:'10px 14px', marginBottom:8 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{s.name}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                    {formatDateShort(s.createdAt)} → {formatDateShort(s.closedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════ TAB: PARTIDOS ══════════════ */}
      {tab === 'partidos' && (
        <>
          {/* Banner temporada activa */}
          {activeSeason && (
            <div style={{ fontSize:12, color:'var(--accent)', fontWeight:600,
              marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:7, height:7, borderRadius:'50%',
                background:'var(--accent)', display:'inline-block' }} />
              {activeSeason.name}
            </div>
          )}

          {isAdmin && !showForm && (
            <button className="btn btn-ac btn-full" onClick={openForm}>
              + Registrar partido
            </button>
          )}

          {/* ── Formulario ── */}
          {showForm && (
            <div className="card" style={{ marginBottom:14 }}>
              {/* Stepper */}
              <div style={{ display:'flex', gap:4, marginBottom:16 }}>
                {['Partido','Jugadores','Resultado'].map((lbl, i) => (
                  <div key={i} style={{ flex:1, textAlign:'center' }}>
                    <div style={{ height:3, borderRadius:2, marginBottom:4,
                      background: step >= i+1 ? 'var(--accent)' : 'var(--border2)',
                      transition:'background .3s' }} />
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5,
                      color: step >= i+1 ? 'var(--accent)' : 'var(--muted)' }}>{lbl}</div>
                  </div>
                ))}
              </div>

              {/* Step 1 */}
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
                      Se registrará en: {activeSeason.name}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-gh" style={{ flex:1 }} onClick={closeForm}>Cancelar</button>
                    <button className="btn btn-ac" style={{ flex:2 }} disabled={!date} onClick={() => setStep(2)}>
                      Siguiente →
                    </button>
                  </div>
                </>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <>
                  <div style={{ display:'flex', gap:8, marginBottom:12 }}>
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
                      <div style={{ fontSize:10, color:'var(--muted)', fontWeight:700 }}>Sin equipo</div>
                    </div>
                  </div>

                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8, textAlign:'center' }}>
                    Toca para asignar → A → B{triangular?' → C':''} → sin equipo
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(80px,1fr))',
                    gap:6, marginBottom:14 }}>
                    {players.map(p => {
                      const team = assign[p.uid] ?? 0;
                      const active = team !== 0;
                      return (
                        <div key={p.uid} onClick={() => toggleAssign(p.uid)}
                          style={{ padding:'7px 4px', borderRadius:10, cursor:'pointer', textAlign:'center',
                            border:`1.5px solid ${active ? TEAM_COLOR[team] : 'var(--border2)'}`,
                            background: active ? TEAM_BG[team] : 'var(--surface2)',
                            transition:'all .15s' }}>
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
                    <button className="btn btn-ac" style={{ flex:2 }} disabled={!canStep3} onClick={() => setStep(3)}>
                      Siguiente →
                    </button>
                  </div>
                </>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <>
                  {teamKeys.map(k => {
                    const team     = teamOf(k);
                    const setScore = k==='A'?setScoreA:k==='B'?setScoreB:setScoreC;
                    const score    = k==='A'?scoreA:k==='B'?scoreB:scoreC;
                    const setMvp   = k==='A'?setMvpA:k==='B'?setMvpB:setMvpC;
                    const mvp      = k==='A'?mvpA:k==='B'?mvpB:mvpC;
                    return (
                      <div key={k} style={{ marginBottom:14, padding:12, borderRadius:10,
                        background:TEAM_BG[k], border:`1px solid ${TEAM_COLOR[k]}33` }}>
                        <div style={{ fontWeight:700, color:TEAM_COLOR[k], marginBottom:10, fontSize:13 }}>
                          {TEAM_LABEL[k]} — {team.map(p=>p.nickname).join(', ')}
                        </div>
                        <div className="grid-2">
                          <div><label>Goles</label>
                            <input type="number" min={0} value={score}
                              onChange={e => setScore(e.target.value)}
                              style={{ borderColor:TEAM_COLOR[k]+'66' }} />
                          </div>
                          <div><label>MVP</label>
                            <select value={mvp} onChange={e => setMvp(e.target.value)}
                              style={{ borderColor:TEAM_COLOR[k]+'66' }}>
                              <option value="">— ninguno —</option>
                              {team.map(p => <option key={p.uid} value={p.uid}>{p.nickname}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-gh" style={{ flex:1 }} onClick={() => setStep(2)}>← Volver</button>
                    <button className="btn btn-ac" style={{ flex:2 }} disabled={saving} onClick={handleSubmit}>
                      {saving ? 'Guardando...' : '✅ Guardar partido'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Lista de partidos */}
          {matches.length === 0 && !showForm && (
            <div style={{ textAlign:'center', padding:'48px 0', color:'var(--muted)' }}>
              <div style={{ fontSize:40, marginBottom:8 }}>📭</div>
              <div>No hay partidos registrados</div>
            </div>
          )}

          {matches.map(m => {
            const keys = m.triangular ? ['A','B','C'] : ['A','B'];
            const scores  = { A:m.scoreA, B:m.scoreB, C:m.scoreC };
            const maxScore = Math.max(...keys.map(k => scores[k] ?? -1));
            const mvps     = { A:m.mvpA, B:m.mvpB, C:m.mvpC };

            return (
              <div key={m.id} className="card" style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{formatDateShort(m.createdAt)}</div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{m.format}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    {keys.map((k, i) => (
                      <div key={k} style={{ display:'flex', alignItems:'center', gap:4 }}>
                        {i > 0 && <span style={{ color:'var(--muted)', fontSize:13 }}>–</span>}
                        <span style={{ fontFamily:'Barlow Condensed', fontSize:28, fontWeight:900, lineHeight:1,
                          color: scores[k] === maxScore ? TEAM_COLOR[k] : 'var(--muted)' }}>
                          {scores[k]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns: m.triangular ? '1fr 1fr 1fr' : '1fr 1fr', gap:8 }}>
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
                        {team.map(p => (
                          <div key={p.uid} style={{ fontSize:12, marginBottom:3,
                            fontWeight: p.uid === mvps[k] ? 700 : 400,
                            color: p.uid === mvps[k] ? TEAM_COLOR[k] : 'var(--text)' }}>
                            {p.uid === mvps[k] ? '⭐ ' : ''}{p.nickname}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
