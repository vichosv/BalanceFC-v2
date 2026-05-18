import { useState } from 'react';

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
  const [open, setOpen] = useState(false);
  const activeTab = TABS.find(t => t.id === active);

  const go = (id) => { onChange(id); setOpen(false); };

  return (
    <>
      {/* Backdrop (móvil, cuando el menú está abierto) */}
      {open && <div className="nav-backdrop" onClick={() => setOpen(false)} />}

      <nav className={`navbar ${open ? 'open' : ''}`}>
        {/* Logo — solo desktop (sidebar). Clic → Inicio */}
        <div className="nav-logo" onClick={() => go('inicio')}
          style={{ cursor:'pointer' }}>
          <span style={{ fontSize:24 }}>⚽</span>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20,
            fontWeight:900, letterSpacing:1, color:'var(--accent)' }}>BalanceFC</span>
        </div>

        {/* Barra compacta — solo móvil */}
        <div className="nav-trigger">
          <button className="nav-trigger-home" onClick={() => go('inicio')}>
            <span style={{ fontSize:20 }}>⚽</span>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16,
              fontWeight:900, letterSpacing:.5, color:'var(--accent)' }}>BalanceFC</span>
          </button>
          <button className="nav-trigger-btn" onClick={() => setOpen(o => !o)}>
            <span style={{ fontSize:16 }}>{activeTab ? activeTab.icon : '🏠'}</span>
            <span style={{ fontSize:13, fontWeight:700 }}>
              {activeTab ? activeTab.label : 'Inicio'}
            </span>
            <span style={{ marginLeft:6, fontSize:15, color:'var(--accent)' }}>
              {open ? '✕' : '☰'}
            </span>
          </button>
        </div>

        {/* Lista de pestañas — desktop: sidebar / móvil: panel desplegable */}
        <div className="nav-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`nav-btn ${active === t.id ? 'active' : ''}`}
              onClick={() => go(t.id)}
            >
              <span className="nav-icon">{t.icon}</span>
              <span className="nav-label">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
