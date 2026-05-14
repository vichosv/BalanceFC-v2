import { useAuth } from '../hooks/useAuth';

const FEATURES = [
  {
    emoji: '🃏',
    title: 'Cartas FC',
    desc:  'Cada jugador tiene su carta estilo FIFA con overall, tier y stats individuales.',
    color: 'var(--accent)',
    bg:    'rgba(0,229,255,.07)',
    border:'rgba(0,229,255,.2)',
  },
  {
    emoji: '⚡',
    title: 'Equipos justos',
    desc:  'Algoritmo de balance por posición y overall. Modos 4v4 hasta triangular 6v6v6.',
    color: 'var(--green)',
    bg:    'rgba(0,230,118,.07)',
    border:'rgba(0,230,118,.2)',
  },
  {
    emoji: '📋',
    title: 'Convocatoria',
    desc:  'Anotate al partido, ve quién confirma y comparte la lista por WhatsApp.',
    color: 'var(--yellow)',
    bg:    'rgba(255,215,64,.07)',
    border:'rgba(255,215,64,.2)',
  },
  {
    emoji: '📊',
    title: 'Historial & Ranking',
    desc:  'Partidos, goles, asistencias y ranking por temporada en tiempo real.',
    color: 'var(--orange)',
    bg:    'rgba(255,145,0,.07)',
    border:'rgba(255,145,0,.2)',
  },
];

const TIERS = [
  { label:'Iron',     cls:'t-iron'     },
  { label:'Bronze',   cls:'t-bronze'   },
  { label:'Silver',   cls:'t-silver'   },
  { label:'Gold',     cls:'t-gold'     },
  { label:'Emerald',  cls:'t-emerald'  },
  { label:'Sapphire', cls:'t-sapphire' },
  { label:'Ruby',     cls:'t-ruby'     },
  { label:'Diamond',  cls:'t-diamond'  },
  { label:'Legend',   cls:'t-legend'   },
];

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)',
      background:'radial-gradient(ellipse at 50% -10%, rgba(0,229,255,.12) 0%, transparent 60%), var(--bg)' }}>

      {/* ── Hero ── */}
      <div style={{ textAlign:'center', padding:'64px 24px 40px' }}>
        <div style={{ fontSize:72, marginBottom:16, filter:'drop-shadow(0 0 32px rgba(0,229,255,.4))' }}>
          ⚽
        </div>
        <h1 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'clamp(48px,10vw,88px)',
          fontWeight:900, letterSpacing:2, margin:0, lineHeight:1,
          background:'linear-gradient(135deg, #fff 0%, var(--accent) 60%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          BalanceFC
        </h1>
        <p style={{ color:'var(--muted)', fontSize:'clamp(14px,3vw,18px)',
          marginTop:10, marginBottom:0, letterSpacing:.5 }}>
          Fút de barrio · Stats y equipos justos
        </p>
      </div>

      {/* ── Tier strip ── */}
      <div style={{ display:'flex', justifyContent:'center', gap:6, flexWrap:'wrap',
        padding:'0 24px 48px', maxWidth:600, margin:'0 auto' }}>
        {TIERS.map(t => (
          <div key={t.cls} className={`fc ${t.cls}`}
            style={{ width:52, aspectRatio:'.68', borderRadius:8, overflow:'hidden',
              display:'flex', alignItems:'flex-end', justifyContent:'center',
              paddingBottom:4, position:'relative' }}>
            <div className="fc-bg" />
            <div className="fc-shine" />
            <span style={{ position:'relative', zIndex:2,
              fontSize:8, fontFamily:"'Barlow Condensed',sans-serif",
              fontWeight:700, opacity:.8, letterSpacing:.5 }}>
              {t.label.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      {/* ── Features ── */}
      <div style={{ maxWidth:840, margin:'0 auto', padding:'0 20px 48px',
        display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14 }}>
        {FEATURES.map(f => (
          <div key={f.title} style={{ background:f.bg, border:`1px solid ${f.border}`,
            borderRadius:16, padding:'20px 18px' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>{f.emoji}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18,
              fontWeight:800, color:f.color, letterSpacing:.5, marginBottom:6 }}>
              {f.title}
            </div>
            <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* ── CTA ── */}
      <div style={{ textAlign:'center', padding:'0 24px 80px' }}>
        <button onClick={login}
          style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
            gap:12, padding:'16px 36px', borderRadius:14,
            border:'1px solid var(--border2)', background:'var(--surface)',
            color:'var(--text)', fontSize:16, fontWeight:700, cursor:'pointer',
            transition:'border-color .15s, background .15s, transform .15s',
            boxShadow:'0 4px 24px rgba(0,0,0,.4)' }}
          onMouseOver={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.transform='translateY(-2px)'; }}
          onMouseOut={e  => { e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.transform='none'; }}>
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Entrar con Google
        </button>
        <p style={{ marginTop:14, fontSize:12, color:'var(--muted)' }}>
          Solo para miembros del grupo · Creado por VichoSV
        </p>
      </div>
    </div>
  );
}
