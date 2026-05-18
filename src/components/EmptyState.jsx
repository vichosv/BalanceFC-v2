// Estado vacío reutilizable — estilo Blue Lock
export default function EmptyState({
  icon = '📭',
  title,
  subtitle,
  action,        // { label, onClick }
  compact = false,
}) {
  return (
    <div className="anim-fade-up" style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      textAlign:'center', gap:10,
      padding: compact ? '28px 18px' : '48px 24px',
    }}>
      {/* Ícono con glow hexagonal */}
      <div style={{ position:'relative', marginBottom:4 }}>
        <div style={{
          position:'absolute', inset:'-18px',
          background:'radial-gradient(circle, rgba(0,200,255,.18) 0%, transparent 70%)',
          filter:'blur(6px)',
        }} />
        <div style={{
          position:'relative',
          width:72, height:72, borderRadius:18,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:34,
          background:'rgba(14,19,24,.7)',
          border:'1px solid rgba(0,212,255,.3)',
          boxShadow:'inset 0 1px 0 rgba(255,255,255,.05)',
        }}>
          {icon}
        </div>
      </div>

      <div style={{
        fontFamily:"'Barlow Condensed',sans-serif",
        fontSize:20, fontWeight:800, letterSpacing:.5,
        textTransform:'uppercase', color:'var(--text)',
      }}>
        {title}
      </div>

      {subtitle && (
        <div style={{ fontSize:13, color:'var(--muted)', maxWidth:280,
          lineHeight:1.5 }}>
          {subtitle}
        </div>
      )}

      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop:8, padding:'10px 22px', borderRadius:10, border:'none',
            background:'var(--accent)', color:'#000',
            fontWeight:800, fontSize:13, cursor:'pointer',
            boxShadow:'0 6px 20px rgba(0,180,255,.3)',
          }}>
          {action.label}
        </button>
      )}
    </div>
  );
}
