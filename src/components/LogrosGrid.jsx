import { TIER_COLOR } from '../utils/logros';

export default function LogrosGrid({ unlocked, locked }) {
  const all = [
    ...unlocked.map(l => ({ ...l, _on: true  })),
    ...locked.map(l   => ({ ...l, _on: false })),
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {all.map(l => {
        const c = TIER_COLOR[l.tier];
        return (
          <div key={l.id} style={{
            display:'flex', alignItems:'center', gap:12,
            padding:'10px 12px', borderRadius:12,
            background: l._on ? c.bg : 'rgba(255,255,255,.03)',
            border: `1px solid ${l._on ? c.border : 'rgba(255,255,255,.08)'}`,
            opacity: l._on ? 1 : 0.42,
          }}>
            {/* Icono estilo Steam */}
            <div style={{
              width:46, height:46, borderRadius:10, flexShrink:0,
              background:'rgba(0,0,0,.35)',
              border:`1.5px solid ${l._on ? c.border : 'rgba(255,255,255,.1)'}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:26,
              filter: l._on ? 'none' : 'grayscale(1) brightness(.5)',
              boxShadow: l._on ? `0 0 14px ${c.border}55` : 'none',
            }}>
              {l._on ? l.emoji : '🔒'}
            </div>

            {/* Texto */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{
                fontSize:13, fontWeight:800, lineHeight:1.2, marginBottom:2,
                color: l._on ? c.text : 'var(--muted)',
              }}>
                {l.name}
              </div>
              <div style={{ fontSize:10, color:'var(--muted)', lineHeight:1.35 }}>
                {l.desc}
              </div>
            </div>

            {/* Badge tier (solo unlocked) */}
            {l._on && (
              <div style={{
                fontSize:8, fontWeight:800, color:c.text,
                textTransform:'uppercase', letterSpacing:.8,
                background:c.bg, border:`1px solid ${c.border}`,
                borderRadius:5, padding:'2px 6px', flexShrink:0,
              }}>
                {l.tier}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
