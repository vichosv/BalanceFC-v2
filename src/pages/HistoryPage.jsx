import { useState } from 'react';
import { useMatches, logMatch, deleteMatch, updateMatch, setMatchVideo, castVote } from '../hooks/useMatches';
import { useSeasons, createSeason, closeSeason, deleteSeason } from '../hooks/useSeasons';
import { overall } from '../utils/stats';

const FORMATS    = ['Libre','4v4','5v5','6v6','7v7','Triangular (6v6v6)'];
const TEAM_COLOR = { A:'var(--green)', B:'var(--blue)', C:'var(--orange)' };
const TEAM_BG    = { A:'rgba(0,230,118,.12)', B:'rgba(68,138,255,.12)', C:'rgba(255,145,0,.12)' };
const TEAM_LABEL = { A:'Equipo A', B:'Equipo B', C:'Equipo C' };

function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric' });
}
function fmtDateTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('es-CL', {
    day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
  });
}

function cycleTeam(cur, tri) {
  if (cur === 0)   return 'A';
  if (cur === 'A') return 'B';
  if (cur === 'B') return tri ? 'C' : 0;
  return 0;
}

// ── Counter ───────────────────────────────────────────────────
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
  const [seasonEndDate,  setSeasonEndDate]  = useState('');
  const [savingSeason,   setSavingSeason]   = useState(false);

  // ── Match form ──
  const [showForm,     setShowForm]     = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [step,         setStep]         = useState(1);
  const [format,       setFormat]       = useState('6v6');
  const [date,         setDate]         = useState('');
  const [videoUrl,     setVideoUrl]     = useState('');
  const [assign,       setAssign]       = useState({});
  const [scoreA,       setScoreA]       = useState('');
  const [scoreB,       setScoreB]       = useState('');
  const [scoreC,       setScoreC]       = useState('');
  const [pStats,       setPStats]       = useState({});
  const [saving,       setSaving]       = useState(false);

  const tri      = format === 'Triangular (6v6v6)';
  const teamKeys = tri ? ['A','B','C'] : ['A','B'];

  const teamOf  = k => players.filter(p => assign[p.uid] === k);
  const countA  = teamOf('A').length;
  const countB  = teamOf('B').length;
  const countC  = teamOf('C').length;
  const canStep3 = countA > 0 && countB > 0 && (!tri || countC > 0);

  function resetForm() {
    setEditingMatch(null);
    setStep(1); setFormat('6v6'); setDate(''); setVideoUrl('');
    setAssign({}); setScoreA(''); setScoreB(''); setScoreC(''); setPStats({});
  }

  function handleEdit(m) {
    setEditingMatch(m);
    setFormat(m.format || '6v6');
    setDate(m.date || '');
    setVideoUrl(m.videoUrl || '');
    setScoreA(String(m.scoreA ?? ''));
    setScoreB(String(m.scoreB ?? ''));
    setScoreC(String(m.scoreC ?? ''));
    const newAssign = {};
    (m.teamA || []).forEach(p => { newAssign[p.uid] = 'A'; });
    (m.teamB || []).forEach(p => { newAssign[p.uid] = 'B'; });
    (m.teamC || []).forEach(p => { newAssign[p.uid] = 'C'; });
    setAssign(newAssign);
    setPStats(m.playerStats || {});
    setStep(1);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(m) {
    if (!window.confirm('¿Eliminar este partido? Se revertirán las estadísticas de todos los jugadores.')) return;
    try { await deleteMatch(m); }
    catch(e) { alert('Error: ' + e.message); }
  }

  function toggleAssign(uid) {
    setAssign(prev => ({ ...prev, [uid]: cycleTeam(prev[uid] ?? 0, tri) }));
  }

  function setStat(uid, field, val) {
    setPStats(prev => {
      const next = { ...prev, [uid]: { ...(prev[uid] || { goals:0, assists:0 }), [field]: val } };
      // Auto-update team score when goals change
      if (field === 'goals') {
        const teamKey = assign[uid];
        if (teamKey) {
          const total = players
            .filter(p => assign[p.uid] === teamKey)
            .reduce((s, p) => s + (next[p.uid]?.goals || 0), 0);
          if (teamKey === 'A') setScoreA(String(total));
          else if (teamKey === 'B') setScoreB(String(total));
          else if (teamKey === 'C') setScoreC(String(total));
        }
      }
      return next;
    });
  }

  async function handleCreateSeason() {
    if (!seasonName.trim()) return;
    setSavingSeason(true);
    await createSeason(seasonName.trim(), user.uid, seasonEndDate || null);
    setSeasonName(''); setSeasonEndDate(''); setShowSeasonForm(false); setSavingSeason(false);
  }

  async function handleDeleteSeason(id, name) {
    if (!window.confirm(`¿Eliminar la temporada "${name}"? Esta acción no se puede deshacer.`)) return;
    await deleteSeason(id);
  }

  async function handleSubmit() {
    const sA = parseInt(scoreA), sB = parseInt(scoreB);
    const sC = tri ? parseInt(scoreC) : 0;
    if (isNaN(sA) || isNaN(sB) || (tri && isNaN(sC))) { alert('Ingresa los marcadores'); return; }
    setSaving(true);
    try {
      const data = {
        date, format, triangular: tri,
        seasonId: editingMatch ? editingMatch.seasonId : (activeSeason?.id || null),
        videoUrl: videoUrl.trim() || null,
        teamA: teamOf('A').map(p => ({ uid:p.uid, nickname:p.nickname, position:p.position })),
        teamB: teamOf('B').map(p => ({ uid:p.uid, nickname:p.nickname, position:p.position })),
        teamC: tri ? teamOf('C').map(p => ({ uid:p.uid, nickname:p.nickname, position:p.position })) : [],
        scoreA: sA, scoreB: sB, scoreC: sC,
        playerStats: pStats,
        createdBy: user.uid,
      };
      if (editingMatch) {
        await updateMatch(editingMatch, data);
      } else {
        await logMatch(data);
      }
      resetForm(); setShowForm(false);
    } catch(e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  if (lM || lS) return <div className="page" style={{ color:'var(--muted)' }}>Cargando...</div>;

  const visibleTabs = [
    { id:'historial', label:'⚽ Partidos' },
    ...(isAdmin ? [{ id:'temporada', label:'📅 Temporada' }] : []),
  ];

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="page-title">📊 Historial</div>

      {/* ── Tabs ── */}
      {visibleTabs.length > 1 && (
        <div style={{ display:'flex', gap:4, marginBottom:14, background:'var(--surface2)',
          borderRadius:10, padding:4 }}>
          {visibleTabs.map(t => (
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
      )}

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
            <button className="btn btn-ac btn-full"
              onClick={() => { resetForm(); setShowForm(true); }}>
              + Registrar partido
            </button>
          )}

          {/* ── Form ── */}
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
                  <div style={{ marginBottom:12 }}>
                    <label>Link de video <span style={{ color:'var(--muted)', fontWeight:400 }}>(opcional)</span></label>
                    <input placeholder="https://youtube.com/..."
                      value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
                  </div>
                  {activeSeason && (
                    <div style={{ fontSize:11, color:'var(--accent)', marginBottom:10 }}>
                      Temporada: {activeSeason.name}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-gh" style={{ flex:1 }}
                      onClick={() => { resetForm(); setShowForm(false); }}>Cancelar</button>
                    <button className="btn btn-ac" style={{ flex:2 }}
                      disabled={!date} onClick={() => setStep(2)}>Siguiente →</button>
                  </div>
                </>
              )}

              {/* Step 2 */}
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

              {/* Step 3 */}
              {step === 3 && (
                <>
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
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px',
                            padding:'5px 12px', borderBottom:'1px solid var(--border)',
                            fontSize:10, color:'var(--muted)', fontWeight:700, textTransform:'uppercase' }}>
                            <span>Jugador</span>
                            <span style={{ textAlign:'center' }}>Goles</span>
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
                      {saving ? 'Guardando...' : editingMatch ? '✅ Guardar cambios' : '✅ Guardar partido'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Lista de partidos ── */}
          {matches.length === 0 && !showForm && (
            <div style={{ textAlign:'center', padding:'48px 0', color:'var(--muted)' }}>
              <div style={{ fontSize:40, marginBottom:8 }}>📭</div>
              <div>No hay partidos registrados</div>
            </div>
          )}

          {matches.map(m => (
            <MatchCard key={m.id} m={m} players={players} isAdmin={isAdmin}
              userId={user?.uid}
              onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </>
      )}

      {/* ══════════ TAB: TEMPORADA (solo admin) ══════════ */}
      {tab === 'temporada' && isAdmin && (
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
                    {activeSeason.endDate && ` · Hasta ${new Date(activeSeason.endDate + 'T00:00:00')
                      .toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric' })}`}
                  </div>
                </div>
                <button onClick={() => window.confirm('¿Cerrar esta temporada?') && closeSeason(activeSeason.id)}
                  style={{ padding:'7px 12px', borderRadius:8,
                    border:'1px solid rgba(255,82,82,.3)', background:'rgba(255,82,82,.08)',
                    color:'var(--red)', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'16px 0 12px', color:'var(--muted)', fontSize:13 }}>
              No hay temporada activa
            </div>
          )}

          {!activeSeason && (
            !showSeasonForm ? (
              <button className="btn btn-ac btn-full" onClick={() => setShowSeasonForm(true)}>
                + Nueva temporada
              </button>
            ) : (
              <div className="card" style={{ marginBottom:12 }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>Nueva temporada</div>
                <div style={{ marginBottom:10 }}>
                  <label>Nombre</label>
                  <input placeholder="ej: Temporada 1 — 2026"
                    value={seasonName} onChange={e => setSeasonName(e.target.value)} />
                </div>
                <div style={{ marginBottom:14 }}>
                  <label>Fecha de término <span style={{ color:'var(--muted)', fontWeight:400 }}>(opcional)</span></label>
                  <input type="date" value={seasonEndDate}
                    onChange={e => setSeasonEndDate(e.target.value)} />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-gh" style={{ flex:1 }}
                    onClick={() => { setShowSeasonForm(false); setSeasonName(''); setSeasonEndDate(''); }}>
                    Cancelar
                  </button>
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
                <div key={s.id} className="card" style={{ padding:'10px 14px', marginBottom:8,
                  display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                      {fmtDate(s.createdAt)} → {fmtDate(s.closedAt || s.endDate)}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteSeason(s.id, s.name)}
                    style={{ padding:'5px 10px', borderRadius:8,
                      border:'1px solid rgba(255,82,82,.3)', background:'rgba(255,82,82,.08)',
                      color:'var(--red)', cursor:'pointer', fontSize:11, fontWeight:700, flexShrink:0 }}>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Match Card ────────────────────────────────────────────────
function MatchCard({ m, players, isAdmin, onEdit, onDelete, userId }) {
  const [videoEditOpen, setVideoEditOpen] = useState(false);
  const [videoInput,    setVideoInput]    = useState(m.videoUrl || '');
  const [savingVideo,   setSavingVideo]   = useState(false);

  // ── Voting state ──
  const [showVote, setShowVote] = useState(false);
  const [mvpPick,  setMvpPick]  = useState('');
  const [gkPick,   setGkPick]   = useState('');
  const [voting,   setVoting]   = useState(false);

  const allMatchPlayers = [...(m.teamA||[]), ...(m.teamB||[]), ...(m.teamC||[])];
  const canVote  = userId && allMatchPlayers.some(p => p.uid === userId);
  const hasVoted = !!(m.votes?.[userId]);
  const isVoteOpen = m.createdAt && (Date.now() - m.createdAt < 86400000);
  const votes      = m.votes || {};
  const voteCount  = Object.keys(votes).length;
  const msLeft     = m.createdAt ? Math.max(0, m.createdAt + 86400000 - Date.now()) : 0;
  const hLeft      = Math.floor(msLeft / 3600000);
  const mLeft      = Math.floor((msLeft % 3600000) / 60000);

  // GK candidates: prefer position GK, fallback to all
  const gkCandidates = allMatchPlayers.filter(p => players.find(x => x.uid === p.uid)?.position === 'GK');
  const gkPool = gkCandidates.length > 0 ? gkCandidates : allMatchPlayers;

  function getVoteWinner(field) {
    const counts = {};
    Object.values(votes).forEach(v => { if (v[field]) counts[v[field]] = (counts[v[field]] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    return { uid: top[0], count: top[1], player: players.find(p => p.uid === top[0]) };
  }

  async function handleVote() {
    if (!mvpPick || !gkPick) return;
    setVoting(true);
    try {
      await castVote(m.id, userId, { mvp: mvpPick, gk: gkPick });
      setShowVote(false);
    } catch(e) { alert('Error: ' + e.message); }
    setVoting(false);
  }

  const keys      = m.triangular ? ['A','B','C'] : ['A','B'];
  const scores    = { A: m.scoreA, B: m.scoreB, C: m.scoreC };
  const maxScore  = Math.max(...keys.map(k => scores[k] ?? -1));
  const winnerKey = keys.find(k => scores[k] === maxScore);
  const ps        = m.playerStats || {};

  // Top scorers for winner banner
  const topScorers = Object.entries(ps)
    .filter(([, s]) => (s.goals || 0) > 0)
    .sort(([, a], [, b]) => (b.goals || 0) - (a.goals || 0))
    .slice(0, 3)
    .map(([uid]) => players.find(p => p.uid === uid))
    .filter(Boolean);

  const displayDate = m.date
    ? new Date(m.date + 'T00:00:00').toLocaleDateString('es-CL',
        { day:'numeric', month:'short', year:'numeric' })
    : fmtDate(m.createdAt);
  const displayTime = fmtDateTime(m.createdAt);

  async function handleSaveVideo() {
    setSavingVideo(true);
    try {
      await setMatchVideo(m.id, videoInput.trim() || null);
      setVideoEditOpen(false);
    } catch(e) { alert('Error: ' + e.message); }
    setSavingVideo(false);
  }

  return (
    <div className="card" style={{ marginBottom:12, padding:0, overflow:'hidden' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
        padding:'12px 14px 10px', borderBottom:'1px solid var(--border)' }}>
        <div>
          <div style={{ fontWeight:800, fontSize:15 }}>{m.format}</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{displayTime}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            {keys.map((k, i) => (
              <span key={k} style={{ display:'flex', alignItems:'center', gap:5 }}>
                {i > 0 && <span style={{ color:'var(--muted)', fontSize:18, fontWeight:700, lineHeight:1 }}>–</span>}
                <span style={{ fontFamily:'Barlow Condensed', fontSize:30, fontWeight:900, lineHeight:1,
                  color: scores[k] === maxScore ? TEAM_COLOR[k] : 'var(--muted)' }}>
                  {scores[k]}
                </span>
              </span>
            ))}
          </div>
          {winnerKey && (
            <div style={{ fontSize:10, color:TEAM_COLOR[winnerKey], fontWeight:700, marginTop:2,
              display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end', flexWrap:'wrap' }}>
              <span>Ganó {TEAM_LABEL[winnerKey]}</span>
              {topScorers.length > 0 && (
                <span style={{ color:'var(--muted)' }}>
                  {topScorers.map((p, i) => (
                    <span key={p.uid}>{i > 0 ? ' · ' : ' '}{p.emoji || '⚽'} {p.nickname}</span>
                  ))}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Teams ── */}
      <div style={{ display:'grid',
        gridTemplateColumns: m.triangular ? '1fr 1fr 1fr' : '1fr 1fr',
        gap:0 }}>
        {keys.map((k, ki) => {
          const team   = m[`team${k}`] || [];
          const winner = scores[k] === maxScore;
          return (
            <div key={k} style={{ padding:'10px 12px',
              borderRight: ki < keys.length - 1 ? '1px solid var(--border)' : 'none',
              background: winner ? TEAM_BG[k] : 'transparent' }}>
              <div style={{ fontSize:10, fontWeight:800, color: winner ? TEAM_COLOR[k] : 'var(--muted)',
                textTransform:'uppercase', letterSpacing:.8, marginBottom:7,
                display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:6, height:6, borderRadius:'50%',
                  background: TEAM_COLOR[k], display:'inline-block', flexShrink:0 }} />
                {TEAM_LABEL[k]} {winner ? '🏆' : ''}
                <span style={{ marginLeft:'auto', color: winner ? TEAM_COLOR[k] : 'var(--border2)',
                  fontSize:9 }}>Prom {avgOf(team, players)}</span>
              </div>
              {team.map(p => {
                const pl = players.find(x => x.uid === p.uid);
                const ov = pl ? overall(pl) : null;
                const g  = ps[p.uid]?.goals   || 0;
                const a  = ps[p.uid]?.assists || 0;
                return (
                  <div key={p.uid} style={{ display:'flex', alignItems:'center', gap:5,
                    marginBottom:4, minWidth:0 }}>
                    <span style={{ fontSize:13, flexShrink:0 }}>{pl?.emoji || '⚽'}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text)',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                      {p.nickname}
                      {ov != null && (
                        <span style={{ color:'var(--muted)', fontSize:10, fontWeight:400 }}> ({ov})</span>
                      )}
                    </span>
                    {g > 0 && (
                      <span style={{ fontSize:10, fontWeight:800, padding:'1px 5px', borderRadius:4,
                        background:'rgba(0,230,118,.18)', color:'var(--green)',
                        border:'1px solid rgba(0,230,118,.3)', flexShrink:0 }}>
                        ⚽{g}
                      </span>
                    )}
                    {a > 0 && (
                      <span style={{ fontSize:10, fontWeight:800, padding:'1px 5px', borderRadius:4,
                        background:'rgba(68,138,255,.18)', color:'var(--blue)',
                        border:'1px solid rgba(68,138,255,.3)', flexShrink:0 }}>
                        A{a}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── Votación: form ── */}
      {showVote && (
        <div style={{ padding:'14px', borderTop:'1px solid var(--border)',
          background:'var(--surface2)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--yellow)',
            textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
            🗳️ Votación · {hLeft}h {mLeft}m restantes
          </div>

          {/* MVP */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text)', marginBottom:7 }}>
              ⭐ MVP — mejor jugador
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {allMatchPlayers.map(p => {
                const pl = players.find(x => x.uid === p.uid);
                const sel = mvpPick === p.uid;
                return (
                  <button key={p.uid} onClick={() => setMvpPick(p.uid)}
                    style={{ padding:'6px 11px', borderRadius:8, cursor:'pointer', fontSize:12,
                      fontWeight:700, border: sel ? 'none' : '1px solid var(--border2)',
                      background: sel ? 'var(--yellow)' : 'var(--surface)',
                      color: sel ? '#000' : 'var(--text)', transition:'all .15s' }}>
                    {pl?.emoji || '⚽'} {p.nickname}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Arquero */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text)', marginBottom:7 }}>
              🧤 Arquero — mejor bajo los palos
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {gkPool.map(p => {
                const pl = players.find(x => x.uid === p.uid);
                const sel = gkPick === p.uid;
                return (
                  <button key={p.uid} onClick={() => setGkPick(p.uid)}
                    style={{ padding:'6px 11px', borderRadius:8, cursor:'pointer', fontSize:12,
                      fontWeight:700, border: sel ? 'none' : '1px solid var(--border2)',
                      background: sel ? 'var(--accent)' : 'var(--surface)',
                      color: sel ? '#000' : 'var(--text)', transition:'all .15s' }}>
                    {pl?.emoji || '🧤'} {p.nickname}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setShowVote(false)}
              style={{ flex:1, padding:'8px', borderRadius:8, border:'1px solid var(--border2)',
                background:'transparent', color:'var(--muted)', cursor:'pointer', fontSize:13 }}>
              Cancelar
            </button>
            <button onClick={handleVote}
              disabled={!mvpPick || !gkPick || voting}
              style={{ flex:2, padding:'8px', borderRadius:8, border:'none', fontSize:13,
                fontWeight:800, cursor: (!mvpPick || !gkPick) ? 'default' : 'pointer',
                background: (!mvpPick || !gkPick) ? 'var(--border2)' : 'var(--yellow)',
                color: (!mvpPick || !gkPick) ? 'var(--muted)' : '#000',
                transition:'all .15s' }}>
              {voting ? 'Votando...' : '✅ Confirmar voto'}
            </button>
          </div>
        </div>
      )}

      {/* ── Votación: resultados ── */}
      {!isVoteOpen && voteCount > 0 && (() => {
        const mvpW = getVoteWinner('mvp');
        const gkW  = getVoteWinner('gk');
        return (mvpW || gkW) ? (
          <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)',
            background:'rgba(255,215,64,.04)',
            display:'flex', gap:16, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontSize:10, fontWeight:700, color:'var(--yellow)',
              textTransform:'uppercase', letterSpacing:1 }}>
              Votación ({voteCount})
            </span>
            {mvpW?.player && (
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span>⭐</span>
                <span style={{ fontSize:12, fontWeight:700 }}>
                  {mvpW.player.emoji || '⚽'} {mvpW.player.nickname}
                </span>
                <span style={{ fontSize:10, color:'var(--muted)' }}>{mvpW.count}v</span>
              </div>
            )}
            {gkW?.player && (
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span>🧤</span>
                <span style={{ fontSize:12, fontWeight:700 }}>
                  {gkW.player.emoji || '⚽'} {gkW.player.nickname}
                </span>
                <span style={{ fontSize:10, color:'var(--muted)' }}>{gkW.count}v</span>
              </div>
            )}
          </div>
        ) : null;
      })()}

      {/* ── Video edit inline ── */}
      {videoEditOpen && (
        <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)',
          background:'var(--surface2)', display:'flex', gap:8, alignItems:'center' }}>
          <input placeholder="https://youtube.com/..." value={videoInput}
            onChange={e => setVideoInput(e.target.value)}
            style={{ flex:1, fontSize:12 }} />
          <button onClick={() => setVideoEditOpen(false)}
            style={{ padding:'5px 10px', borderRadius:8, border:'1px solid var(--border2)',
              background:'transparent', color:'var(--muted)', cursor:'pointer', fontSize:12 }}>
            Cancelar
          </button>
          <button onClick={handleSaveVideo} disabled={savingVideo}
            style={{ padding:'5px 10px', borderRadius:8, border:'none',
              background:'var(--accent)', color:'#000', fontWeight:700, cursor:'pointer', fontSize:12 }}>
            {savingVideo ? '...' : 'Guardar'}
          </button>
        </div>
      )}

      {/* ── Actions ── */}
      {(m.videoUrl || isAdmin || (isVoteOpen && canVote) || hasVoted) && (
        <div style={{ padding:'8px 12px', borderTop:'1px solid var(--border)',
          display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>

          {/* Botón votar */}
          {isVoteOpen && canVote && !hasVoted && (
            <button onClick={() => setShowVote(v => !v)}
              style={{ padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer',
                fontWeight:700, fontSize:12,
                background: showVote ? 'rgba(255,215,64,.35)' : 'rgba(255,215,64,.15)',
                color:'var(--yellow)' }}>
              🗳️ Votar
            </button>
          )}
          {isVoteOpen && canVote && !hasVoted && (
            <span style={{ fontSize:10, color:'var(--muted)' }}>{hLeft}h {mLeft}m</span>
          )}
          {hasVoted && (
            <span style={{ fontSize:11, color:'var(--muted)', fontWeight:700 }}>✅ Votaste</span>
          )}

          {m.videoUrl && (
            <a href={m.videoUrl} target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                borderRadius:8, background:'#c00', color:'#fff',
                fontWeight:700, fontSize:12, textDecoration:'none' }}>
              ▶ Ver video
            </a>
          )}
          {isAdmin && (
            <>
              <button onClick={() => onEdit(m)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                  borderRadius:8, border:'1px solid var(--border2)', background:'var(--surface2)',
                  color:'var(--text)', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                ✏️ Editar
              </button>
              <button onClick={() => { setVideoInput(m.videoUrl || ''); setVideoEditOpen(v => !v); }}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                  borderRadius:8, border:'1px solid var(--border2)', background:'var(--surface2)',
                  color:'var(--text)', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                🎬 Video
              </button>
              <button onClick={() => onDelete(m)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                  borderRadius:8, border:'1px solid rgba(255,82,82,.3)',
                  background:'rgba(255,82,82,.08)', color:'var(--red)',
                  fontWeight:700, fontSize:12, cursor:'pointer' }}>
                🗑 Borrar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function avgOf(team, players) {
  if (!team?.length) return '—';
  const ovrs = team.map(p => {
    const pl = players.find(x => x.uid === p.uid);
    return pl ? overall(pl) : null;
  }).filter(v => v != null);
  if (!ovrs.length) return '—';
  return (ovrs.reduce((s, v) => s + v, 0) / ovrs.length).toFixed(1);
}
