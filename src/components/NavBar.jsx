const TABS = [
  { id:'inicio',    label:'Inicio',    icon:'🏠' },
  { id:'jugadores', label:'Jugadores', icon:'👥' },
  { id:'partido',   label:'Equipos',   icon:'⚽' },
  { id:'historial', label:'Historial', icon:'📊' },
  { id:'ranking',   label:'Ranking',      icon:'🏆' },
  { id:'tienda',    label:'Tienda',       icon:'🛍️' },
  { id:'apuestas',  label:'Apuestas',     icon:'🎰' },
  { id:'conv',      label:'Convocatoria', icon:'📋' },
  { id:'perfil',    label:'Perfil',       icon:'👤' },
];

export default function NavBar({ active, onChange }) {
  return (
    <nav className="navbar">
      {/* Logo — solo visible en desktop (sidebar) */}
      <div className="nav-logo">
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
