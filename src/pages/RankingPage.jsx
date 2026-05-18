import { useState } from 'react';
import { useSeasons } from '../hooks/useSeasons';
import { useMatches } from '../hooks/useMatches';
import { overall }    from '../utils/stats';
import EmptyState from '../components/EmptyState';

// ── Puntos ────────────────────────────────────────────────────
function calcPts(stats) {
  const pj = stats.matches || 0;
  if (!pj) return 0;
  const wr  = (stats.wins    || 0) / pj;
  const gpm = (stats.goals   || 0) / pj;
  const apm = (stats.assists || 0) / pj;
  return Math.round(wr * 50 + gpm * 25 + apm * 15 + pj * 2);
}
function globalPts(p) { return calcPts(p.history || {}); }
function seasonPts(p, sid) { return calcPts(p.seasons?.[sid] || {}); }

// ── Resultado de un partido para un jugador ───────────────────
function getResult(m, uid) {
  const teams = { A: m.teamA||[], B: m.teamB||[], C: m.teamC||[] };
  const myKey = Object.keys(teams).find(k => teams[k].some(p => p.uid === uid));
  if (!myKey) return null;
  const keys  = m.triangular ? ['A','B','C'] : ['A','B'];
  const sc    = { A: m.scoreA??0, B: m.scoreB??0, C: m.scoreC??0 };
  const max   = Math.max(...keys.map(k => sc[k]));
  if (sc[myKey] < max) return 'L';
  return keys.filter(k => sc[k] === max).length > 1 ? 'D' : 'W';
}

// ── Racha actual ──────────────────────────────────────────────
function computeStreak(uid, matches) {
  const mine = matches.filter(m =>
    [...(m.teamA||[]),...(m.teamB||[]),...(m.teamC||[])].some(p => p.uid === uid)
  );
  if (!mine.length) return null;
  const rs = mine.map(m => getResult(m, uid)).filter(Boolean);
  if (!rs.length) return null;
  let count = 1;
  for (let i = 1; i < rs.length; i++) {
    if (rs[i] === rs[0]) count++; else break;
  }
  return { type: rs[0], count };
}

// ── Tendencia (últimos 5 partidos) ────────────────────────────
function computeTrend(uid, matches) {
  const mine = matches
    .filter(m => [...(m.teamA||[]),...(m.teamB||[]),...(m.teamC||[])].some(p => p.uid === uid))
    .slice(0, 5);
  if (mine.length < 3) return 0;
  const rs   = mine.map(m => getResult(m, uid)).filter(Boolean);
  const wr   = rs.filter(r => r === 'W').length / rs.length;
  if (wr >= 0.6)  return 1;
  if (wr <= 0.25) return -1;
  return 0;
}

// ── Química de equipo ─────────────────────────────────────────
function computeChemistry(matches) {
  const pairs = {};
  matches.forEach(m => {
    const ts = [
      { team: m.teamA||[], sc: m.scoreA??0 },
      { team: m.teamB||[], sc: m.scoreB??0 },
      ...(m.triangular ? [{ team: m.teamC||[], sc: m.scoreC??0 }] : []),
    ];
    const max     = Math.max(...ts.map(t => t.sc));
    const winners = ts.filter(t => t.sc === max);
    ts.forEach(({ team, sc }) => {
      const won = sc === max && winners.length === 1;
      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) {
          const key = [team[i].uid, team[j].uid].sort().join('|');
          if (!pairs[key]) pairs[key] = { uids: [team[i].uid, team[j].uid].sort(), together:0, wins:0 };
          pairs[key].together++;
          if (won) pairs[key].wins++;
        }
      }
    });
  });
  return Object.values(pairs)
    .filter(p => p.together >= 2)
    .sort((a, b) => {
      const s = p => (p.wins / p.together) * Math.log2(p.together + 1);
      return s(b) - s(a);
    });
}

// ═════════════════════════════════════════════════════════════
export default function RankingPage({ ctx }) {
  const { players = [], user } = ctx;
  const { seasons, activeSeason, loading: lS } = useSeasons();
  const { matches,      loading: lM } = useMatches();
  const [view, setView] = useState(activeSeason ? 'season' : 'global');

  if (lS || lM) return <div className="page" style={{ color:'var(--muted)' }}>Cargando...</div>;

  const sid        = activeSeason?.id || null;
  const prevSeason = seasons.find(s => s.status === 'closed') || null;

  function getStats(p) {
    if (view === 'season' && sid)                  return p.seasons?.[sid]        || {};
    if (view === 'prev'   && prevSeason)            return p.seasons?.[prevSeason.id] || {};
    return p.history || {};
  }

  // ── Lista rankeada ──
  const ranked = [...players]
    .filter(p => (getStats(p).matches || 0) > 0)
    .map(p => {
      const stats = getStats(p);
      return {
        ...p,
        _stats: stats,
        pts:    calcPts(stats),
        streak: computeStreak(p.uid, matches),
        trend:  computeTrend(p.uid, matches),
      };
    })
    .sort((a, b) => b.pts - a.pts);

  // ── Highlights ──
  const active = players.filter(p => (p.history?.matches || 0) > 0);
  const byField = (field) => active.reduce((best, p) =>
    (p.history?.[field] || 0) > (best?.history?.[field] || 0) ? p : best, null);
  const topMatches = byField('matches');
  const topWins    = byField('wins');
  const topGoals   = byField('goals');
  const topAssists = byField('assists');
  const bestWR     = active
    .filter(p => (p.history?.matches || 0) >= 3)
    .reduce((best, p) => {
      const wr = (p.history?.wins||0) / (p.history?.matches||1);
      return wr > ((best?.history?.wins||0) / (best?.history?.matches||1)) ? p : best;
    }, null);

  // MVP desde votos cerrados
  const mvpCounts = {};
  matches.forEach(m => {
    if (!m.votes || !Object.keys(m.votes).length) return;
    if (m.createdAt && Date.now() - m.createdAt < 86400000) return;
    const counts = {};
    Object.values(m.votes).forEach(v => { if (v.mvp) counts[v.mvp] = (counts[v.mvp]||0)+1; });
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    if (top) mvpCounts[top[0]] = (mvpCounts[top[0]]||0)+1;
  });
  const mvpTop    = Object.entries(mvpCounts).sort((a,b)=>b[1]-a[1])[0];
  const topMVP    = mvpTop ? players.find(p => p.uid === mvpTop[0]) : null;
  const topMVPCnt = mvpTop?.[1] || 0;

  // ── Química ──
  const chemistry = computeChemistry(matches).slice(0, 6);

  // ── Tabla de goleadores / asistidores (según período) ──
  const scorers = [...players]
    .map(p => ({ p, n: getStats(p).goals || 0 }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 8);
  const assisters = [...players]
    .map(p => ({ p, n: getStats(p).assists || 0 }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 8);

  // ── Bloques de 4 ──
  const blocks = [];
  for (let i = 0; i < ranked.length; i += 4) blocks.push(ranked.slice(i, i+4));

  const blockLabel = i => {
    if (i === 0) return { label:'🏆 Élite', color:'var(--yellow)' };
    if (i === 1) return { label:'⚡ Alta', color:'var(--accent)' };
    if (i === 2) return { label:'🔵 Media', color:'var(--blue)' };
    return { label:`Grupo ${i+1}`, color:'var(--muted)' };
  };

  return (
    <div className="page">
      <div className="page-title">🏆 Ranking</div>

      {/* ── Highlights ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>

        {/* Total partidos — ocupa fila completa visualmente */}
        <StatCard
          value={matches.length}
          label="Partidos jugados"
          big />

        {topMatches && (
          <StatCard
            player={topMatches}
            label={`Más partidos (${topMatches.history?.matches})`} />
        )}
        {topWins && (
          <StatCard
            player={topWins}
            label={`Más victorias (${topWins.history?.wins})`} />
        )}
        {bestWR && (
          <StatCard
            player={bestWR}
            label={`Mejor WR (${Math.round((bestWR.history?.wins||0)/(bestWR.history?.matches||1)*100)}%)`} />
        )}
        {topGoals && (
          <StatCard
            player={topGoals}
            label={`⚽ Goleador (${topGoals.history?.goals})`} />
        )}
        {topAssists && (
          <StatCard
            player={topAssists}
            label={`🅰️ Asistidor (${topAssists.history?.assists})`} />
        )}
        {topMVP && (
          <StatCard
            player={topMVP}
            label={`⭐ Más MVP (${topMVPCnt})`} />
        )}
      </div>

      {/* ── Toggle temporada/global ── */}
      <div style={{ display:'flex', gap:4, marginBottom:14, background:'var(--surface2)',
        borderRadius:10, padding:4 }}>
        {[
          ...(sid        ? [{ id:'season', label: activeSeason.name,       icon:'⚡' }] : []),
          ...(prevSeason ? [{ id:'prev',   label: prevSeason.name,         icon:'📜' }] : []),
          { id:'global', label:'Global', icon:'🌍' },
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            style={{ flex:1, padding:'7px 4px', borderRadius:8, border:'none', cursor:'pointer',
              fontWeight:700, fontSize:11, transition:'all .15s',
              background: view === t.id ? 'var(--surface)' : 'transparent',
              color:      view === t.id ? 'var(--accent)'  : 'var(--muted)',
              boxShadow:  view === t.id ? '0 1px 4px rgba(0,0,0,.3)' : 'none' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tabla de goleadores / asistidores ── */}
      {(scorers.length > 0 || assisters.length > 0) && (
        <div className="card" style={{ marginBottom:14 }}>
          {[
            { title:'⚽ Goleadores',  list:scorers,   color:'var(--green)' },
            { title:'🅰️ Asistidores', list:assisters, color:'var(--blue)' },
          ].map(({ title, list, color }) => (
            <div key={title} style={{ marginBottom: title.includes('Gol') ? 16 : 0 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
                textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                {title}
              </div>
              {list.length === 0 ? (
                <div style={{ fontSize:12, color:'var(--muted)', padding:'4px 0' }}>
                  Sin datos
                </div>
              ) : list.map(({ p, n }, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`;
                return (
                  <div key={p.uid} style={{ display:'flex', alignItems:'center',
                    gap:10, padding:'6px 0',
                    borderBottom: i < list.length-1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width:24, textAlign:'center',
                      fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                      fontSize: i < 3 ? 16 : 13,
                      color: i < 3 ? 'var(--yellow)' : 'var(--muted)' }}>
                      {medal}
                    </div>
                    <div style={{ flex:1, fontSize:14, fontWeight:600,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {p.nickname}
                    </div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
                      fontSize:18, fontWeight:900, color }}>
                      {n}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Bloques de ranking ── */}
      {ranked.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="Sin datos"
          subtitle="No hay estadísticas para este período todavía. Jugá un partido para aparecer en el ranking."
          compact
        />
      ) : (
        blocks.map((block, bi) => {
          const { label, color } = blockLabel(bi);
          return (
            <div key={bi} style={{ marginBottom:12, borderRadius:14, overflow:'hidden',
              border:`1px solid ${color}33` }}>
              <div style={{ padding:'7px 14px', background:`${color}18`,
                borderBottom:`1px solid ${color}22`,
                display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:800, fontSize:12, color }}>{label}</span>
                <span style={{ fontSize:10, color:'var(--muted)' }}>
                  #{bi*4+1} – #{Math.min(bi*4+4, ranked.length)}
                </span>
              </div>
              {block.map((p, ri) => (
                <RankRow key={p.uid} p={p} rank={bi*4 + ri + 1}
                  isMe={p.uid === user?.uid} />
              ))}
            </div>
          );
        })
      )}

      {/* ── Química de equipo ── */}
      {chemistry.length > 0 && (
        <div style={{ marginTop:4, marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
            textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
            ⚗️ Química de equipo
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {chemistry.map(pair => {
              const p1  = players.find(p => p.uid === pair.uids[0]);
              const p2  = players.find(p => p.uid === pair.uids[1]);
              const wr  = Math.round(pair.wins / pair.together * 100);
              if (!p1 || !p2) return null;
              return (
                <div key={pair.uids.join('|')}
                  style={{ borderRadius:12, padding:'10px 12px',
                    background:'var(--surface)', border:'1px solid var(--border)',
                    display:'flex', flexDirection:'column', gap:6 }}>
                  {/* Jugadores */}
                  <div style={{ display:'flex', alignItems:'center', gap:0 }}>
                    <PlayerBubble player={p1} />
                    <div style={{ flex:1, display:'flex', flexDirection:'column',
                      alignItems:'center', gap:2 }}>
                      <div style={{ height:1, width:'100%',
                        background: wr >= 70 ? 'rgba(0,230,118,.5)'
                                  : wr >= 50 ? 'rgba(255,215,64,.5)'
                                  : 'rgba(255,82,82,.3)' }} />
                      <span style={{ fontSize:9, fontWeight:800,
                        color: wr >= 70 ? 'var(--green)' : wr >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
                        {wr}%
                      </span>
                    </div>
                    <PlayerBubble player={p2} />
                  </div>
                  {/* Stat */}
                  <div style={{ textAlign:'center', fontSize:10, color:'var(--muted)' }}>
                    {pair.together} juntos · {pair.wins}V
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── RankRow ───────────────────────────────────────────────────
function RankRow({ p, rank, isMe }) {
  const s     = p._stats || {};
  const pj    = s.matches  || 0;
  const v     = s.wins     || 0;
  const g     = s.goals    || 0;
  const a     = s.assists  || 0;
  const wr    = pj ? Math.round(v / pj * 100) : 0;
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  const streak = p.streak;
  const trend  = p.trend;

  const streakIcon  = streak?.type === 'W' ? '🔥' : streak?.type === 'L' ? '🧊' : '•';
  const streakColor = streak?.type === 'W' ? 'var(--green)' : streak?.type === 'L' ? '#64b5f6' : 'var(--muted)';
  const trendIcon   = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';
  const trendColor  = trend > 0 ? 'var(--green)' : trend < 0 ? 'var(--red)' : 'var(--muted)';

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px',
      borderBottom:'1px solid var(--border)',
      background: isMe ? 'rgba(0,229,255,.06)' : 'transparent',
      borderLeft: isMe ? '3px solid var(--accent)' : '3px solid transparent' }}>

      {/* Posición */}
      <div style={{ width:26, textAlign:'center', fontFamily:'Barlow Condensed',
        fontSize: medal ? 18 : 13, fontWeight:700,
        color: rank <= 3 ? 'var(--yellow)' : 'var(--muted)', flexShrink:0 }}>
        {medal || rank}
      </div>

      {/* Emoji + nombre */}
      <div style={{ fontSize:18, flexShrink:0 }}>{p.emoji || '⚽'}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight: isMe ? 800 : 700, fontSize:13,
          color: isMe ? 'var(--accent)' : 'var(--text)',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {p.nickname}
        </div>
        <div style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>
          {pj}PJ · {v}V · {g}G · {a}A · {wr}%WR
        </div>
      </div>

      {/* Racha */}
      {streak && streak.count >= 2 && (
        <div style={{ fontSize:10, fontWeight:800, color:streakColor,
          background:`${streakColor}18`, border:`1px solid ${streakColor}44`,
          borderRadius:6, padding:'2px 6px', flexShrink:0, whiteSpace:'nowrap' }}>
          {streakIcon}{streak.count}{streak.type}
        </div>
      )}

      {/* Pts + tendencia */}
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end' }}>
          <span style={{ fontSize:11, fontWeight:900, color:trendColor }}>{trendIcon}</span>
          <span style={{ fontFamily:'Barlow Condensed', fontSize:20,
            fontWeight:900, color:'var(--accent)' }}>{p.pts}</span>
        </div>
        <div style={{ fontSize:9, color:'var(--muted)', letterSpacing:.5 }}>PTS</div>
      </div>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────
function StatCard({ value, label, player, big }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:12, padding:'12px 14px' }}>
      {player ? (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <span style={{ fontSize:20 }}>{player.emoji || '⚽'}</span>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif",
              fontSize:22, fontWeight:900, color:'var(--text)', lineHeight:1 }}>
              {player.nickname}
            </span>
          </div>
          <div style={{ fontSize:10, color:'var(--muted)', fontWeight:700,
            textTransform:'uppercase', letterSpacing:.5 }}>{label}</div>
        </>
      ) : (
        <>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
            fontSize: big ? 36 : 28, fontWeight:900,
            color:'var(--accent)', lineHeight:1, marginBottom:3 }}>
            {value}
          </div>
          <div style={{ fontSize:10, color:'var(--muted)', fontWeight:700,
            textTransform:'uppercase', letterSpacing:.5 }}>{label}</div>
        </>
      )}
    </div>
  );
}

// ── PlayerBubble ──────────────────────────────────────────────
function PlayerBubble({ player }) {
  const ov = overall(player);
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
      <div style={{ width:36, height:36, borderRadius:'50%',
        background: player.photo
          ? `url(${player.photo}) center/cover`
          : 'linear-gradient(145deg,#07183a,#0d2560)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:'Barlow Condensed', fontWeight:900, fontSize:14, color:'#fff',
        border:'2px solid rgba(100,170,255,0.4)',
        boxShadow:'0 2px 8px rgba(0,0,0,.5)' }}>
        {!player.photo && ov}
      </div>
      <div style={{ fontSize:9, fontWeight:700, color:'var(--muted)',
        maxWidth:44, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        textAlign:'center' }}>
        {player.nickname}
      </div>
    </div>
  );
}
