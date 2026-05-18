import { useState, useEffect } from 'react';
import { useConvocatorias } from '../hooks/useConvocatorias';
import { useMatches }       from '../hooks/useMatches';
import { useSeasons }       from '../hooks/useSeasons';
import { overall, tier }    from '../utils/stats';
import WeeklyChallenges     from '../components/WeeklyChallenges';
import '../components/PlayerCard.css';

// ── Ranking score (igual que HistoryPage) ────────────────────
function calcPts(p, sid) {
  const s  = sid ? (p.seasons?.[sid] || {}) : (p.history || {});
  const pj = s.matches || 0;
  if (!pj) return 0;
  const wr  = (s.wins    || 0) / pj;
  const gpm = (s.goals   || 0) / pj;
  const apm = (s.assists || 0) / pj;
  return Math.round(wr * 50 + gpm * 25 + apm * 15 + pj * 2);
}

// ── Countdown hook ────────────────────────────────────────────
function useCountdown(targetDate, targetTime) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!targetDate || !targetTime) { setRemaining(null); return; }
    const tick = () => {
      const target = new Date(`${targetDate}T${targetTime}`);
      const diff   = target - Date.now();
      if (diff <= 0) { setRemaining({ passed: true }); return; }
      setRemaining({
        d: Math.floor(diff / 86400000),
        h: Math.floor(diff % 86400000 / 3600000),
        m: Math.floor(diff % 3600000  / 60000),
        s: Math.floor(diff % 60000    / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate, targetTime]);

  return remaining;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long' });
}

// ─────────────────────────────────────────────────────────────
export default function HomePage({ ctx, onNavigate }) {
  const { user, players = [], isAdmin } = ctx;
  const { convocatorias } = useConvocatorias();
  const { matches }       = useMatches();
  const { activeSeason }  = useSeasons();

  const sid      = activeSeason?.id || null;
  const player   = players.find(p => p.uid === user?.uid);
  const ov       = player ? overall(player) : null;
  const t        = ov ? tier(ov) : null;

  const nextConv    = convocatorias.find(c => c.status === 'open');
  const totalConf   = nextConv?.confirmados?.length || 0;
  const isConfirmed = nextConv?.confirmados?.some(p => p.uid === user?.uid);
  const countdown   = useCountdown(nextConv?.date, nextConv?.time);
  const lastMatch   = matches[0] || null;

  // ── Ranking ──
  const ranked = [...players]
    .map(p => ({ ...p, pts: calcPts(p, sid) }))
    .sort((a, b) => b.pts - a.pts);

  const myIdx   = ranked.findIndex(p => p.uid === user?.uid);
  const myRank  = myIdx >= 0 ? myIdx + 1 : null;
  const above   = myIdx > 0 ? ranked[myIdx - 1] : null;
  const below   = myIdx >= 0 && myIdx < ranked.length - 1 ? ranked[myIdx + 1] : null;

  // ── Goles esta temporada ──
  const myGoals = sid
    ? (player?.seasons?.[sid]?.goals || 0)
    : (player?.history?.goals || 0);

  // ── Votaciones pendientes ──
  const pendingVotes = matches.filter(m => {
    if (!m.createdAt || Date.now() - m.createdAt >= 86400000) return false;
    const inMatch = [...(m.teamA||[]), ...(m.teamB||[]), ...(m.teamC||[])].some(p => p.uid === user?.uid);
    return inMatch && !m.votes?.[user?.uid];
  });

  return (
    <div className="page">

      {/* ── Hero ── */}
      <div className="anim-fade-up" style={{ textAlign:'center', padding:'24px 0 24px',
        marginBottom:16 }}>
        <div className="anim-logo" style={{ fontSize:54, marginBottom:6 }}>⚽</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
          fontSize:40, fontWeight:900, letterSpacing:2, lineHeight:1,
          background:'linear-gradient(135deg,#fff 0%,var(--accent) 70%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          filter:'drop-shadow(0 2px 18px rgba(0,200,255,.25))' }}>
          BalanceFC
        </div>
        <div style={{ color:'var(--muted)', fontSize:12, marginTop:5,
          letterSpacing:.5 }}>
          Fút de barrio · Stats y equipos justos
        </div>

        {player && (
          <div className="anim-scale-in d1" style={{ display:'inline-flex',
            alignItems:'center', gap:12, marginTop:16,
            background:'rgba(14,19,24,.7)', backdropFilter:'blur(10px)',
            WebkitBackdropFilter:'blur(10px)',
            border:'1px solid rgba(0,212,255,.3)',
            borderRadius:14, padding:'10px 18px',
            boxShadow:'0 6px 22px rgba(0,150,255,.15)' }}>
            {player.photo
              ? <img src={player.photo} alt="" style={{ width:40, height:40,
                  borderRadius:'50%', objectFit:'cover', border:'2px solid var(--accent)' }} />
              : <div className={`fc ${t}`} style={{ width:40, aspectRatio:'.68',
                  borderRadius:6, overflow:'hidden', flexShrink:0 }}>
                  <div className="fc-bg" />
                </div>
            }
            <div style={{ textAlign:'left' }}>
              <div style={{ fontWeight:700, fontSize:14 }}>{player.nickname}</div>
              <div style={{ fontSize:11, color:'var(--muted)' }}>
                OVR {ov}{isAdmin ? ' · ⚡ Admin' : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Votaciones pendientes ── */}
      {pendingVotes.map(m => {
        const msLeft = Math.max(0, m.createdAt + 86400000 - Date.now());
        const hLeft  = Math.floor(msLeft / 3600000);
        const mLeft  = Math.floor((msLeft % 3600000) / 60000);
        return (
          <div key={m.id} onClick={() => onNavigate?.('historial')}
            style={{ marginBottom:10, borderRadius:12, padding:'12px 16px', cursor:'pointer',
              background:'rgba(255,215,64,.08)', border:'1px solid rgba(255,215,64,.35)',
              display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--yellow)',
                textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>
                🗳️ Votación pendiente
              </div>
              <div style={{ fontSize:13, fontWeight:700 }}>{m.format}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>
                Cierra en {hLeft}h {mLeft}m
              </div>
            </div>
            <span style={{ fontSize:22 }}>→</span>
          </div>
        );
      })}

      {/* ── Stats rápidos ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
        {[
          { val: players.length, lbl: 'Jugadores' },
          { val: matches.length, lbl: 'Partidos'  },
          { val: myGoals,        lbl: sid ? 'Goles temp.' : 'Goles' },
        ].map(({ val, lbl }, i) => (
          <div key={lbl} className={`anim-fade-up d${i + 1}`}
            style={{ background:'rgba(14,19,24,.7)',
              backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
              border:'1px solid rgba(0,212,255,.14)',
              borderRadius:12, padding:'12px 8px', textAlign:'center' }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
              fontSize:26, fontWeight:900, color:'var(--accent)', lineHeight:1 }}>{val}</div>
            <div style={{ fontSize:10, color:'var(--muted)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:.5, marginTop:4 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Próximo partido + countdown ── */}
      <div onClick={() => onNavigate?.('conv')}
        className="anim-fade-up d2"
        style={{ marginBottom:16, borderRadius:14, overflow:'hidden', cursor:'pointer',
          border:'1px solid rgba(255,215,64,.3)',
          background:'rgba(255,215,64,.05)',
          backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
          boxShadow:'0 6px 22px rgba(255,180,0,.1)' }}>

        {nextConv ? (
          <>
            {/* Info */}
            <div style={{ padding:'14px 16px', display:'flex',
              justifyContent:'space-between', alignItems:'center',
              borderBottom:'1px solid rgba(255,215,64,.15)' }}>
              <div>
                <div style={{ fontSize:11, color:'var(--yellow)', fontWeight:700,
                  textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>
                  Próximo partido
                </div>
                <div style={{ fontWeight:700, fontSize:14, textTransform:'capitalize' }}>
                  {formatDate(nextConv.date)}
                </div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
                  🕐 {nextConv.time} · 📍 {nextConv.place}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:26,
                  fontWeight:900, color: isConfirmed ? 'var(--green)' : 'var(--yellow)' }}>
                  {totalConf}/{nextConv.maxPlayers}
                </div>
                <div style={{ fontSize:10, color:'var(--muted)' }}>confirmados</div>
                {isConfirmed && (
                  <div style={{ fontSize:11, color:'var(--green)', fontWeight:700, marginTop:2 }}>✅ Vas</div>
                )}
              </div>
            </div>

            {/* Countdown */}
            <div style={{ padding:'12px 16px', textAlign:'center' }}>
              {countdown?.passed ? (
                <div style={{ color:'var(--green)', fontWeight:700, fontSize:14 }}>¡El partido es ahora!</div>
              ) : countdown ? (
                <div style={{ display:'flex', justifyContent:'center', gap:12 }}>
                  {countdown.d > 0 && <CountUnit val={countdown.d} lbl="días" />}
                  <CountUnit val={countdown.h} lbl="hrs" />
                  <CountUnit val={countdown.m} lbl="min" />
                  <CountUnit val={countdown.s} lbl="seg" color="var(--yellow)" />
                </div>
              ) : (
                <div style={{ color:'var(--muted)', fontSize:12 }}>Sin fecha definida</div>
              )}
            </div>
          </>
        ) : (
          <div style={{ padding:'16px', display:'flex', justifyContent:'space-between',
            alignItems:'center' }}>
            <div>
              <div style={{ fontSize:11, color:'var(--yellow)', fontWeight:700,
                textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>
                Próximo partido
              </div>
              <div style={{ fontSize:13, color:'var(--muted)' }}>Sin partido programado</div>
            </div>
            <span style={{ fontSize:20 }}>📋</span>
          </div>
        )}
      </div>

      {/* ── Retos semanales ── */}
      <WeeklyChallenges player={player} matches={matches} />

      {/* ── Ranking ── */}
      {myRank && (
        <div onClick={() => onNavigate?.('ranking')}
          className="anim-fade-up d3"
          style={{ marginBottom:16, borderRadius:14, overflow:'hidden', cursor:'pointer',
            border:'1px solid rgba(0,212,255,.14)',
            background:'rgba(14,19,24,.7)',
            backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)' }}>
          <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)',
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
              textTransform:'uppercase', letterSpacing:1 }}>
              {sid ? `Ranking — ${activeSeason.name}` : 'Ranking global'}
            </span>
            <span style={{ fontSize:10, color:'var(--accent)' }}>Ver completo →</span>
          </div>

          {above && <RankRow player={above} rank={myRank - 1} dim />}
          <RankRow player={ranked[myIdx]} rank={myRank} highlight />
          {below && <RankRow player={below} rank={myRank + 1} dim />}
        </div>
      )}

      {/* ── Último partido ── */}
      {lastMatch && (
        <div onClick={() => onNavigate?.('historial')}
          className="anim-fade-up d4"
          style={{ padding:'12px 16px', borderRadius:14, cursor:'pointer',
            background:'rgba(14,19,24,.7)',
            backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
            border:'1px solid rgba(0,212,255,.14)',
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:11, color:'var(--muted)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>
              Último partido
            </div>
            <div style={{ fontSize:13, color:'var(--text)' }}>{lastMatch.format}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
              fontSize:26, fontWeight:900, color:'var(--text)' }}>
              {lastMatch.scoreA} – {lastMatch.scoreB}
              {lastMatch.triangular ? ` – ${lastMatch.scoreC}` : ''}
            </div>
            <span style={{ fontSize:10, color:'var(--accent)' }}>Ver historial →</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function CountUnit({ val, lbl, color = 'var(--text)' }) {
  return (
    <div style={{ textAlign:'center', minWidth:42 }}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
        fontSize:30, fontWeight:900, color, lineHeight:1 }}>
        {String(val).padStart(2, '0')}
      </div>
      <div style={{ fontSize:9, color:'var(--muted)', fontWeight:700,
        textTransform:'uppercase', letterSpacing:.5 }}>{lbl}</div>
    </div>
  );
}

function RankRow({ player, rank, highlight, dim }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10,
      padding:'10px 16px',
      background: highlight ? 'rgba(0,229,255,.07)' : 'transparent',
      borderLeft: highlight ? '3px solid var(--accent)' : '3px solid transparent',
      opacity: dim ? 0.5 : 1 }}>
      <div style={{ width:28, textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif",
        fontSize: medal ? 18 : 14, fontWeight:700,
        color: rank <= 3 ? 'var(--yellow)' : 'var(--muted)' }}>
        {medal || `#${rank}`}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight: highlight ? 800 : 600, fontSize:14,
          color: highlight ? 'var(--accent)' : 'var(--text)' }}>
          {player.nickname}
        </div>
        <div style={{ fontSize:11, color:'var(--muted)' }}>
          {player.pts} pts
        </div>
      </div>
      {highlight && <div style={{ fontSize:11, color:'var(--accent)', fontWeight:700 }}>Tú</div>}
    </div>
  );
}
