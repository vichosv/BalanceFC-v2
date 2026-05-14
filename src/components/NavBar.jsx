const TABS = [
  { id:'jugadores', label:'Jugadores', icon:'👥' },
  { id:'partido',   label:'Partido',   icon:'⚽' },
  { id:'historial', label:'Historial', icon:'📊' },
  { id:'conv',      label:'Convocatoria', icon:'📋' },
  { id:'perfil',    label:'Perfil',    icon:'👤' },
];

export default function NavBar({ active, onChange }) {
  return (
    <nav className="navbar">
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
