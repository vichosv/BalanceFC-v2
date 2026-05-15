const TABS = [
  { id:'jugadores', label:'Jugadores',    icon:'👥' },
  { id:'ranking',   label:'Ranking',      icon:'🏆' },
  { id:'historial', label:'Historial',    icon:'📊' },
  { id:'conv',      label:'Convocatoria', icon:'📋' },
  { id:'partido',   label:'Equipos',      icon:'⚽' },
  { id:'tienda',    label:'Tienda',       icon:'🛒' },
  { id:'perfil',    label:'Perfil',       icon:'👤' },
];

export default function NavBar({ active, onChange }) {
  return (
    <nav className="navbar">
      {/* Logo — solo visible en desktop (sidebar). Clic → Inicio */}
      <div className="nav-logo" onClick={() => onChange('inicio')}
        style={{ cursor:'pointer' }}>
        <span style={{ fontSize:24 }}>⚽</span>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20,
          fontWeight:900, letterSpacing:1, color:'var(--accent)' }}>BalanceFC</span>
      </div>

      {TABS.map(t => (
        <button
          key={t.id}
          className={`nav-btn ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
