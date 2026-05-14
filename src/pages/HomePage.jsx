import { useConvocatorias } from '../hooks/useConvocatorias';
import { useMatches }       from '../hooks/useMatches';
import { useSeasons }       from '../hooks/useSeasons';
import { overall, tier }    from '../utils/stats';
import '../components/PlayerCard.css';

const NAV_CARDS = [
  { tab:'jugadores', emoji:'👥', label:'Jugadores',    desc:'Plantel y cartas FC',       color:'var(--accent)',  bg:'rgba(0,229,255,.07)',  border:'rgba(0,229,255,.2)'  },
  { tab:'partido',   emoji:'⚽', label:'Partido',      desc:'Generar equipos',            color:'var(--green)',   bg:'rgba(0,230,118,.07)',  border:'rgba(0,230,118,.2)'  },
  { tab:'conv',      emoji:'📋', label:'Convocatoria', desc:'Confirmar asistencia',       color:'var(--yellow)',  bg:'rgba(255,215,64,.07)', border:'rgba(255,215,64,.2)' },
  { tab:'historial', emoji:'📊', label:'Historial',    desc:'Partidos y ranking',         color:'var(--orange)',  bg:'rgba(255,145,0,.07)',  border:'rgba(255,145,0,.2)'  },
  { tab:'perfil',    emoji:'👤', label:'Mi perfil',    desc:'Carta, stats y logros',      color:'var(--purple)',  bg:'rgba(196,126,255,.07)',border:'rgba(196,126,255,.2)'},
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long' });
}

export default function HomePage({ ctx, onNavigate }) {
  const { user, players = [], isAdmin } = ctx;
  const { convocatorias } = useConvocatorias();
  const { matches }       = useMatches();
  const { activeSeason }  = useSeasons();

  const player      = players.find(p => p.uid === user?.uid);
  const ov          = player ? overall(player) : null;
  const t           = ov ? tier(ov) : null;
  const nextConv    = convocatorias.find(c => c.status === 'open');
  const totalConf   = nextConv?.confirmados?.length || 0;
  const isConfirmed = nextConv?.confirmados?.some(p => p.uid === user?.uid);
  const lastMatch   = matches[0] || null;

  return (
    <div className="page">

      {/* ── Hero ── */}
      <div style={{ textAlign:'center', padding:'24px 0 28px',
        background:'radial-gradient(ellipse at 50% 0%, rgba(0,229,255,.1) 0%, transparent 70%)',
        borderRadius:20, marginBottom:20 }}>
        <div style={{ fontSize:56, marginBottom:8,
          filter:'drop-shadow(0 0 20px rgba(0,229,255,.4))' }}>⚽</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
          fontSize:40, fontWeight:900, letterSpacing:2, lineHeight:1,
          background:'linear-gradient(135deg,#fff 0%,var(--accent) 70%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          BalanceFC
        </div>
        <div style={{ color:'var(--muted)', fontSize:13, marginTop:6 }}>
          Fút de barrio · Stats y equipos justos
        </div>

        {/* Mini carta del usuario */}
        {player && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:12,
            marginTop:20, background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:14, padding:'10px 18px' }}>
            {player.photo
              ? <img src={player.photo} alt="" style={{ width:44, height:44,
                  borderRadius:'50%', objectFit:'cover', border:'2px solid var(--accent)' }} />
              : <div className={`fc ${t}`} style={{ width:44, aspectRatio:'.68',
                  borderRadius:8, overflow:'hidden', flexShrink:0 }}>
                  <div className="fc-bg" />
                </div>
            }
            <div style={{ textAlign:'left' }}>
              <div style={{ fontWeight:700, fontSize:15 }}>{player.nickname}</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>
                OVR {ov} · {isAdmin ? '⚡ Admin' : 'Jugador'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Próxima convocatoria ── */}
      {nextConv && (
        <div onClick={() => onNavigate('conv')}
          style={{ cursor:'pointer', marginBottom:16, padding:'14px 16px', borderRadius:14,
            background:'rgba(255,215,64,.07)', border:'1px solid rgba(255,215,64,.25)',
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:11, color:'var(--yellow)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>
              Próximo partido
            </div>
            <div style={{ fontWeight:700, fontSize:15, textTransform:'capitalize' }}>
              {formatDate(nextConv.date)}
            </div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
              🕐 {nextConv.time} · 📍 {nextConv.place}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28,
              fontWeight:900, color: isConfirmed ? 'var(--green)' : 'var(--yellow)' }}>
              {totalConf}/{nextConv.maxPlayers}
            </div>
            <div style={{ fontSize:11, color:'var(--muted)' }}>confirmados</div>
            {isConfirmed && (
              <div style={{ fontSize:11, color:'var(--green)', fontWeight:700, marginTop:2 }}>
                ✅ Vas
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stats rápidos ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:20 }}>
        {[
          { val: players.length,  lbl:'Jugadores' },
          { val: matches.length,  lbl:'Partidos'  },
          { val: activeSeason ? activeSeason.name.split(' ')[0] + ' ' + (activeSeason.name.split(' ')[1] || '') : '—',
            lbl:'Temporada', small: true },
        ].map(({ val, lbl, small }) => (
          <div key={lbl} style={{ background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:12, padding:'12px 8px', textAlign:'center' }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
              fontSize: small ? 16 : 26, fontWeight:900, color:'var(--accent)', lineHeight:1.1 }}>
              {val}
            </div>
            <div style={{ fontSize:10, color:'var(--muted)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:.5, marginTop:4 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Último partido ── */}
      {lastMatch && (
        <div onClick={() => onNavigate('historial')}
          style={{ cursor:'pointer', marginBottom:20, padding:'12px 16px', borderRadius:14,
            background:'var(--surface)', border:'1px solid var(--border)',
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:11, color:'var(--muted)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>
              Último partido
            </div>
            <div style={{ fontSize:13, color:'var(--text)' }}>{lastMatch.format}</div>
          </div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:26,
            fontWeight:900, color:'var(--text)' }}>
            {lastMatch.scoreA} – {lastMatch.scoreB}
            {lastMatch.triangular ? ` – ${lastMatch.scoreC}` : ''}
          </div>
        </div>
      )}

      {/* ── Acceso rápido ── */}
      <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
        textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
        Acceso rápido
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
        {NAV_CARDS.map(n => (
          <div key={n.tab} onClick={() => onNavigate(n.tab)}
            style={{ background:n.bg, border:`1px solid ${n.border}`,
              borderRadius:14, padding:'14px 14px', cursor:'pointer',
              transition:'transform .15s, border-color .15s' }}
            onMouseOver={e => e.currentTarget.style.transform='translateY(-2px)'}
            onMouseOut={e  => e.currentTarget.style.transform='none'}>
            <div style={{ fontSize:28, marginBottom:8 }}>{n.emoji}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16,
              fontWeight:800, color:n.color, marginBottom:3 }}>{n.label}</div>
            <div style={{ fontSize:11, color:'var(--muted)' }}>{n.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
