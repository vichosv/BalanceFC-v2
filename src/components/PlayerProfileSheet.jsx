import { useMatches } from '../hooks/useMatches';
import { useSeasons } from '../hooks/useSeasons';
import { useShopItems } from '../hooks/useShopItems';
import { overall, SK, tier } from '../utils/stats';
import { computeLogros } from '../utils/logros';
import HexRadar from '../components/HexRadar';
import StatEvolutionChart from '../components/StatEvolutionChart';
import LogrosGrid from '../components/LogrosGrid';
import '../components/PlayerCard.css';

const POSITIONS = {
  GK:  'Arquero', DEF: 'Defensor', MID: 'Mediocampo',
  WNG: 'Extremo', FWD: 'Delantero',
};

function getMatchResult(m, uid) {
  const teams = { A: m.teamA||[], B: m.teamB||[], C: m.teamC||[] };
  const myKey = Object.keys(teams).find(k => teams[k].some(p => p.uid === uid));
  if (!myKey) return null;
  const keys = m.triangular ? ['A','B','C'] : ['A','B'];
  const sc   = { A: m.scoreA??0, B: m.scoreB??0, C: m.scoreC??0 };
  const max  = Math.max(...keys.map(k => sc[k]));
  if (sc[myKey] < max) return 'L';
  return keys.filter(k => sc[k] === max).length > 1 ? 'D' : 'W';
}

export default function PlayerProfileSheet({ player, onClose }) {
  const { matches } = useMatches();
  const { activeSeason } = useSeasons();
  const shopItems = useShopItems();

  const ov  = overall(player);
  const t   = tier(ov);
  const sid = activeSeason?.id || null;

  // Cosméticos equipados
  const equipped     = player.equipped || {};
  const findItem     = id => id ? shopItems.find(i => i.id === id) : null;
  const titleItem    = findItem(equipped.title);
  const wallpaperItem = findItem(equipped.wallpaper);
  const wallpaperBg  = wallpaperItem?.cssBackground || null;
  const wpImg        = wallpaperItem?.imageUrl || null;

  // Fondo del sheet: imagen visible arriba, se funde a oscuro hacia abajo
  const sheetBg = !wallpaperBg ? 'var(--bg)'
    : wpImg
      ? `linear-gradient(180deg, rgba(5,8,12,0) 0%, rgba(5,8,12,.30) 14%, rgba(5,8,12,.88) 36%, var(--bg) 54%), url(${wpImg})`
      : `linear-gradient(180deg, rgba(5,8,12,0) 0%, rgba(5,8,12,.45) 18%, var(--bg) 46%), ${wallpaperBg}`;

  const h = player.history  || {};
  const s = sid ? (player.seasons?.[sid] || {}) : null;

  const pj  = h.matches  || 0;
  const v   = h.wins     || 0;
  const g   = h.goals    || 0;
  const a   = h.assists  || 0;
  const wr  = pj ? Math.round(v / pj * 100) : 0;

  // Recent matches
  const recentMatches = matches
    .filter(m => [...(m.teamA||[]),...(m.teamB||[]),...(m.teamC||[])].some(p => p.uid === player.uid))
    .slice(0, 6);

  // MVP count from closed votes
  const mvpCount = matches.filter(m => {
    if (!m.votes || !Object.keys(m.votes).length) return false;
    if (m.createdAt && Date.now() - m.createdAt < 86400000) return false;
    const counts = {};
    Object.values(m.votes).forEach(v => { if (v.mvp) counts[v.mvp] = (counts[v.mvp]||0)+1; });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] === player.uid;
  }).length;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:999 }} />

      {/* Sheet */}
      <div style={{ position:'fixed', bottom:0, left:'50%',
        transform:'translateX(-50%)',
        width:'100%', maxWidth:480, zIndex:1000,
        maxHeight:'90vh', overflowY:'auto',
        backgroundColor:'var(--bg)',
        background: sheetBg,
        backgroundSize: wallpaperBg ? '100% 100%, 100% auto' : 'auto',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'local',
        borderRadius:'20px 20px 0 0',
        paddingBottom:40 }}>

        {/* Handle + cerrar */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 2px' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--border2)' }} />
        </div>
        <button onClick={onClose}
          style={{ position:'absolute', top:12, right:16, background:'var(--surface2)',
            border:'none', borderRadius:8, color:'var(--muted)', cursor:'pointer',
            fontWeight:700, fontSize:16, padding:'4px 10px' }}>
          ✕
        </button>

        {/* ── Hero: info sobre la imagen del sheet ── */}
        <div style={{
          position:'relative',
          display:'flex', alignItems:'flex-end',
          minHeight: wallpaperBg ? 168 : 'auto',
          borderBottom:'1px solid var(--border)',
        }}>
          <div style={{ position:'relative', zIndex:1, width:'100%',
            display:'flex', alignItems:'center', gap:18,
            padding:'20px 22px' }}>
            {/* Foto / card mini */}
            {player.photo ? (
              <img src={player.photo} alt=""
                style={{ width:78, height:78, borderRadius:14, objectFit:'cover',
                  border:'2.5px solid var(--accent)',
                  boxShadow:'0 6px 20px rgba(0,0,0,.55)', flexShrink:0 }} />
            ) : (
              <div className={`fc ${t}`}
                style={{ width:62, aspectRatio:'.68', borderRadius:9, overflow:'hidden',
                  flexShrink:0, boxShadow:'0 6px 20px rgba(0,0,0,.55)' }}>
                <div className="fc-bg" />
              </div>
            )}

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:900, fontSize:25, lineHeight:1.1,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                textShadow: wallpaperBg ? '0 2px 8px rgba(0,0,0,.85)' : 'none' }}>
                {player.emoji || '⚽'} {player.nickname}
              </div>
              {titleItem && (
                <div style={{ marginTop:6 }}>
                  <span style={{
                    display:'inline-block',
                    background:'rgba(0,229,255,.22)',
                    border:'1px solid var(--accent)',
                    borderRadius:14, padding:'3px 11px',
                    fontSize:11, fontWeight:700, letterSpacing:1,
                    color:'var(--accent)', textTransform:'uppercase',
                  }}>
                    ⟨ {titleItem.name} ⟩
                  </span>
                </div>
              )}
              <div style={{ fontSize:14, marginTop:5,
                color: wallpaperBg ? 'rgba(255,255,255,.85)' : 'var(--muted)',
                textShadow: wallpaperBg ? '0 1px 6px rgba(0,0,0,.8)' : 'none' }}>
                {POSITIONS[player.position] || 'Sin posición'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:7 }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:32,
                  fontWeight:900, color:'var(--accent)', lineHeight:1,
                  textShadow: wallpaperBg ? '0 2px 8px rgba(0,0,0,.85)' : 'none' }}>{ov}</span>
                <span style={{ fontSize:12, fontWeight:700, textTransform:'uppercase',
                  letterSpacing:.5,
                  color: wallpaperBg ? 'rgba(255,255,255,.75)' : 'var(--muted)' }}>OVR</span>
                <span style={{ fontSize:12, fontWeight:700, padding:'3px 9px',
                  borderRadius:6,
                  background: wallpaperBg ? 'rgba(0,0,0,.55)' : 'var(--surface2)',
                  color: wallpaperBg ? '#fff' : 'var(--muted)',
                  textTransform:'uppercase', letterSpacing:.5 }}>
                  {t}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats globales ── */}
        <div style={{ padding:'14px 20px 0' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)',
            textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
            Estadísticas globales
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
            {[
              { val: pj,              lbl:'PJ' },
              { val: v,               lbl:'Victorias' },
              { val: `${wr}%`,        lbl:'Win Rate' },
              { val: g,               lbl:'Goles' },
              { val: a,               lbl:'Asistencias' },
              { val: mvpCount || '—', lbl:'MVP' },
            ].map(({ val, lbl }) => (
              <div key={lbl} style={{ background:'var(--surface)', borderRadius:10,
                padding:'10px 8px', textAlign:'center',
                border:'1px solid var(--border)' }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
                  fontSize:22, fontWeight:900, color:'var(--accent)', lineHeight:1 }}>
                  {val}
                </div>
                <div style={{ fontSize:9, color:'var(--muted)', fontWeight:700,
                  textTransform:'uppercase', letterSpacing:.5, marginTop:3 }}>{lbl}</div>
              </div>
            ))}
          </div>

          {/* Temporada activa */}
          {s && (s.matches || 0) > 0 && (
            <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:10,
              background:'rgba(0,229,255,.06)', border:'1px solid rgba(0,229,255,.2)' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--accent)',
                textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                {activeSeason.name}
              </div>
              <div style={{ display:'flex', gap:16 }}>
                {[
                  { val: s.matches||0, lbl:'PJ' },
                  { val: s.wins||0,    lbl:'V' },
                  { val: s.goals||0,   lbl:'G' },
                  { val: s.assists||0, lbl:'A' },
                ].map(({ val, lbl }) => (
                  <div key={lbl} style={{ textAlign:'center' }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
                      fontSize:20, fontWeight:900, color:'var(--text)', lineHeight:1 }}>{val}</div>
                    <div style={{ fontSize:9, color:'var(--muted)', fontWeight:700,
                      textTransform:'uppercase' }}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Radar + valores */}
          <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)',
            textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>
            Atributos
          </div>
          <div style={{ display:'flex', justifyContent:'center', margin:'0 auto 4px' }}>
            <HexRadar player={player} size={200} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, marginBottom:8 }}>
            {SK.map(sk => {
              const val = player[sk.key] ?? 50;
              return (
                <div key={sk.key} style={{ textAlign:'center', padding:'4px 0' }}>
                  <div style={{ fontSize:15, fontWeight:900, color:sk.color, lineHeight:1 }}>{val}</div>
                  <div style={{ fontSize:9, color:'var(--muted)', fontWeight:700,
                    letterSpacing:.5, textTransform:'uppercase', marginTop:1 }}>
                    {sk.label.slice(0,3)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Evolución de stats */}
          {(player.statHistory || []).length >= 2 && (
            <>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)',
                textTransform:'uppercase', letterSpacing:1, margin:'12px 0 6px' }}>
                Evolución
              </div>
              <StatEvolutionChart player={player} />
            </>
          )}

          {/* Logros */}
          {(() => {
            const { unlocked, locked } = computeLogros(player, { mvpCount });
            if (!unlocked.length && !locked.length) return null;
            return (
              <>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)',
                  textTransform:'uppercase', letterSpacing:1, margin:'16px 0 10px' }}>
                  Logros
                  <span style={{ marginLeft:8, color:'var(--accent)' }}>
                    {unlocked.length}/{unlocked.length + locked.length}
                  </span>
                </div>
                <LogrosGrid unlocked={unlocked} locked={locked} />
              </>
            );
          })()}

          {/* Últimos partidos */}
          {recentMatches.length > 0 && (
            <>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)',
                textTransform:'uppercase', letterSpacing:1, margin:'16px 0 10px' }}>
                Últimos partidos
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {recentMatches.map(m => {
                  const res = getMatchResult(m, player.uid);
                  const ps  = m.playerStats?.[player.uid] || {};
                  const g   = ps.goals   || 0;
                  const a   = ps.assists || 0;
                  const resColor = res === 'W' ? 'var(--green)' : res === 'L' ? 'var(--red)' : 'var(--muted)';
                  const resBg    = res === 'W' ? 'rgba(0,230,118,.15)' : res === 'L' ? 'rgba(255,82,82,.12)' : 'var(--surface2)';
                  const date = m.date
                    ? new Date(m.date+'T00:00:00').toLocaleDateString('es-CL', { day:'numeric', month:'short' })
                    : new Date(m.createdAt).toLocaleDateString('es-CL', { day:'numeric', month:'short' });
                  return (
                    <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10,
                      padding:'8px 12px', borderRadius:10,
                      background:'var(--surface)', border:'1px solid var(--border)' }}>
                      {/* Resultado */}
                      <div style={{ width:28, height:28, borderRadius:8, background:resBg,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontWeight:900, fontSize:13, color:resColor, flexShrink:0 }}>
                        {res || '?'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:700 }}>{m.format}</div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>{date}</div>
                      </div>
                      {/* Goles / asistencias */}
                      <div style={{ display:'flex', gap:5 }}>
                        {g > 0 && (
                          <span style={{ fontSize:10, fontWeight:800, padding:'2px 6px',
                            borderRadius:4, background:'rgba(0,230,118,.18)', color:'var(--green)',
                            border:'1px solid rgba(0,230,118,.3)' }}>⚽{g}</span>
                        )}
                        {a > 0 && (
                          <span style={{ fontSize:10, fontWeight:800, padding:'2px 6px',
                            borderRadius:4, background:'rgba(68,138,255,.18)', color:'var(--blue)',
                            border:'1px solid rgba(68,138,255,.3)' }}>A{a}</span>
                        )}
                        {g === 0 && a === 0 && (
                          <span style={{ fontSize:10, color:'var(--border2)' }}>—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
