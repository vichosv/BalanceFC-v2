import { useState } from 'react';
import { overall, smartScore, teamAvg } from '../utils/stats';
import { generate2Teams, generate3Teams, remixTeams } from '../utils/teams';

const FORMATS = ['Libre','4v4','5v5','6v6','7v7','Triangular (6v6v6)'];
const MODES   = [
  { value:'smart',   label:'Inteligente (posición + overall)' },
  { value:'overall', label:'Solo overall' },
];
const TEAM_COLORS = { A:'var(--green)', B:'var(--blue)', C:'var(--orange)' };
const TEAM_LABELS = { A:'Equipo A', B:'Equipo B', C:'Equipo C' };

export default function MatchPage({ ctx }) {
  const players = ctx.players ?? [];

  const [selected, setSelected] = useState(new Set());
  const [format,   setFormat]   = useState('6v6');
  const [mode,     setMode]     = useState('smart');
  const [teams,    setTeams]    = useState(null);
  const [search,   setSearch]   = useState('');

  const isTriangular = format === 'Triangular (6v6v6)';

  const filtered = players.filter(p =>
    (p.nickname || '').toLowerCase().includes(search.toLowerCase())
  );

  function togglePlayer(uid) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
    setTeams(null);
  }

  function selectAll(val) {
    setSelected(val ? new Set(players.map(p => p.uid)) : new Set());
    setTeams(null);
  }

  function genTeams() {
    const sel = players.filter(p => selected.has(p.uid));
    if (sel.length < (isTriangular ? 3 : 2)) {
      alert(`Selecciona al menos ${isTriangular ? 3 : 2} jugadores`);
      return;
    }
    const scored = sel.map(p => ({
      ...p,
      score: mode === 'smart' ? smartScore(p) : overall(p),
    }));
    setTeams(isTriangular ? generate3Teams(scored, mode) : generate2Teams(scored, mode));
  }

  function remix() {
    if (!teams) return;
    setTeams(remixTeams(teams, mode));
  }

  function movePlayer(uid, fromKey) {
    if (!teams) return;
    const cycle = { A:'B', B: teams.triangular ? 'C' : 'A', C:'A' };
    const toKey  = cycle[fromKey];
    const from   = [...teams[fromKey]];
    const to     = [...teams[toKey]];
    const idx    = from.findIndex(p => p.uid === uid);
    if (idx === -1) return;
    to.push(from.splice(idx, 1)[0]);
    const next = { ...teams, [fromKey]: from, [toKey]: to };
    next.avgA = teamAvg(next.A);
    next.avgB = teamAvg(next.B);
    if (teams.triangular) next.avgC = teamAvg(next.C);
    setTeams(next);
  }

  function shareWA() {
    if (!teams) return;
    const keys = teams.triangular ? ['A','B','C'] : ['A','B'];
    const lines = ['BALANCEFC - Partido del dia', ''];
    keys.forEach(k => {
      lines.push(TEAM_LABELS[k] + ':');
      teams[k].forEach(p => lines.push('  ' + p.nickname));
      lines.push('');
    });
    window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
  }

  const teamKeys = teams ? (teams.triangular ? ['A','B','C'] : ['A','B']) : [];

  return (
    <div className="page">
      <div className="page-title">⚽ Partido</div>

      {/* ── Config ── */}
      <div className="card" style={{ marginBottom:12 }}>
        <div className="grid-2">
          <div>
            <label>Formato</label>
            <select value={format} onChange={e => { setFormat(e.target.value); setTeams(null); }}>
              {FORMATS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label>Balance</label>
            <select value={mode} onChange={e => { setMode(e.target.value); setTeams(null); }}>
              {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Selector de jugadores ── */}
      <input placeholder="🔍 Buscar jugador..." value={search}
        onChange={e => setSearch(e.target.value)} style={{ marginBottom:8 }} />

      <div style={{ display:'flex', gap:8, marginBottom:10 }}>
        <button className="btn btn-gh" style={{ flex:1 }} onClick={() => selectAll(true)}>✓ Todos</button>
        <button className="btn btn-gh" style={{ flex:1 }} onClick={() => selectAll(false)}>✗ Ninguno</button>
        <span style={{ alignSelf:'center', fontSize:12, color:'var(--muted)', whiteSpace:'nowrap' }}>
          {selected.size} sel.
        </span>
      </div>

      <div className="players-sel-grid" style={{ marginBottom:14 }}>
        {filtered.map(p => (
          <div key={p.uid}
            className={`sel-chip ${selected.has(p.uid) ? 'sel-chip--on' : ''}`}
            onClick={() => togglePlayer(p.uid)}>
            <span style={{ fontSize:18 }}>{p.emoji || '⚽'}</span>
            <span style={{ fontSize:11, fontWeight:700, overflow:'hidden',
              textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>
              {p.nickname}
            </span>
            <span style={{ fontSize:10, color:'var(--muted)' }}>{overall(p)}</span>
          </div>
        ))}
      </div>

      {players.length === 0 && (
        <div style={{ textAlign:'center', padding:'24px 0', color:'var(--muted)', fontSize:13 }}>
          No hay jugadores registrados
        </div>
      )}

      <button className="btn btn-ac btn-full" onClick={genTeams}>⚡ Generar equipos</button>

      {/* ── Resultado ── */}
      {teams && (
        <>
          {/* Balance bar */}
          <div className="card" style={{ marginBottom:12, marginTop:8 }}>
            {teams.triangular ? (
              <div style={{ display:'flex', justifyContent:'space-around' }}>
                {teamKeys.map(k => (
                  <div key={k} style={{ textAlign:'center' }}>
                    <div style={{ fontFamily:'Barlow Condensed', fontSize:26, fontWeight:700,
                      color: TEAM_COLORS[k] }}>
                      {(teams[`avg${k}`] || 0).toFixed(1)}
                    </div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{TEAM_LABELS[k]}</div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div style={{ display:'flex', justifyContent:'space-between',
                  fontSize:12, color:'var(--muted)', fontWeight:700, marginBottom:8 }}>
                  <span>{TEAM_LABELS.A}</span>
                  <span>{TEAM_LABELS.B}</span>
                </div>
                <div style={{ height:8, borderRadius:4, background:'var(--border2)',
                  overflow:'hidden', marginBottom:8 }}>
                  <div style={{
                    height:'100%', borderRadius:4,
                    background:'linear-gradient(90deg,var(--green),var(--accent))',
                    width:`${(teams.avgA / (teams.avgA + teams.avgB)) * 100}%`,
                    transition:'width .8s cubic-bezier(.4,0,.2,1)'
                  }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:'Barlow Condensed', fontSize:24, fontWeight:700,
                    color:'var(--green)' }}>{teams.avgA.toFixed(1)}</span>
                  <span style={{ fontSize:11, color:'var(--muted)', alignSelf:'flex-end',
                    paddingBottom:3 }}>PROMEDIO</span>
                  <span style={{ fontFamily:'Barlow Condensed', fontSize:24, fontWeight:700,
                    color:'var(--blue)' }}>{teams.avgB.toFixed(1)}</span>
                </div>
              </>
            )}
          </div>

          {/* Team blocks */}
          {teamKeys.map(k => (
            <TeamField key={k} team={teams[k]} label={TEAM_LABELS[k]}
              color={TEAM_COLORS[k]} teamKey={k}
              toLabel={k === 'A' ? 'B' : k === 'B' ? (teams.triangular ? 'C' : 'A') : 'A'}
              onMove={movePlayer} avg={teams[`avg${k}`] || 0} />
          ))}

          {/* Acciones */}
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            <button className="btn btn-gh" style={{ flex:1 }} onClick={remix}>🔀 Mezclar</button>
            <button onClick={shareWA}
              style={{ flex:1, padding:11, borderRadius:10, border:'none',
                background:'#25d366', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14 }}>
              📲 Compartir
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TeamField({ team, label, color, teamKey, toLabel, onMove, avg }) {
  return (
    <div style={{ borderRadius:14, overflow:'hidden', marginBottom:12,
      border:'1px solid rgba(100,180,255,0.15)' }}>
      <div style={{ background:'rgba(0,40,120,0.7)', borderBottom:'1px solid rgba(100,180,255,0.15)',
        display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px' }}>
        <span style={{ color, fontWeight:700, fontSize:14 }}>⚽ {label}</span>
        <span style={{ color, fontSize:12 }}>Prom {avg.toFixed(1)}</span>
      </div>
      <div style={{
        background:'linear-gradient(180deg,rgba(0,15,60,.92) 0%,rgba(0,40,110,.82) 50%,rgba(0,15,60,.92) 100%)',
        padding:'14px 8px', minHeight:140,
        display:'flex', flexWrap:'wrap', justifyContent:'center', alignItems:'center', gap:10,
      }}>
        {team.map(p => (
          <PlayerDot key={p.uid} player={p} toLabel={toLabel}
            onClick={() => onMove(p.uid, teamKey)} />
        ))}
      </div>
    </div>
  );
}

function PlayerDot({ player, toLabel, onClick }) {
  const ov = overall(player);
  return (
    <div onClick={onClick} title={`${player.nickname} → Equipo ${toLabel}`}
      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5,
        cursor:'pointer', minWidth:58 }}>
      <div style={{
        width:50, height:50, borderRadius:'50%',
        background: player.photo
          ? `url(${player.photo}) center/cover`
          : 'linear-gradient(145deg,#07183a,#0d2560)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:'Barlow Condensed', fontWeight:900, fontSize:19, color:'#e8f4ff',
        border:'2.5px solid rgba(100,170,255,0.55)',
        boxShadow:'0 3px 14px rgba(0,0,0,.7)',
        transition:'transform .15s',
      }}
        onMouseOver={e => e.currentTarget.style.transform='scale(1.12)'}
        onMouseOut={e  => e.currentTarget.style.transform='scale(1)'}>
        {!player.photo && ov}
      </div>
      <div style={{
        fontFamily:'Barlow Condensed', fontSize:13, fontWeight:800, color:'#fff',
        textShadow:'0 1px 4px rgba(0,0,0,1)',
        maxWidth:70, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
      }}>
        {(player.nickname || '').toUpperCase()}
      </div>
    </div>
  );
}
