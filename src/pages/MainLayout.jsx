import { useState } from 'react';
import { useAuth }    from '../hooks/useAuth';
import { usePlayers } from '../hooks/usePlayer';
import { useMatches } from '../hooks/useMatches';
import { useGameNotifications } from '../hooks/useGameNotifications';
import { ToastProvider } from '../components/ToastProvider';
import NavBar        from '../components/NavBar';
import HomePage      from './HomePage';
import PlayersPage   from './PlayersPage';
import MatchPage     from './MatchPage';
import HistoryPage   from './HistoryPage';
import RankingPage   from './RankingPage';
import ConvPage      from './ConvPage';
import ProfilePage   from './ProfilePage';
import ShopPage      from './ShopPage';

function Shell() {
  const [tab, setTab] = useState('inicio');
  const [viewAsPlayer, setViewAsPlayer] = useState(false);
  const auth    = useAuth();
  const { players, loading } = usePlayers();
  const { matches } = useMatches();

  const ctx = {
    ...auth,
    // Si el admin activó "ver como jugador", se comporta como usuario normal
    isAdmin:      auth.isAdmin && !viewAsPlayer,
    isAdminReal:  auth.isAdmin,
    viewAsPlayer,
    setViewAsPlayer,
    players,
    loadingPlayers: loading,
  };

  // Player actual (para watchers automáticos de notificaciones)
  const player = players.find(p => p.uid === auth.user?.uid);
  useGameNotifications(player, matches);

  return (
    <div className="app-shell">
      {/* Banner: modo "ver como jugador" activo */}
      {viewAsPlayer && (
        <div onClick={() => setViewAsPlayer(false)}
          style={{ position:'fixed', bottom:14, left:'50%', transform:'translateX(-50%)',
            zIndex:1500, cursor:'pointer',
            background:'var(--accent)', color:'#000', fontWeight:800, fontSize:12,
            padding:'8px 16px', borderRadius:20,
            boxShadow:'0 4px 18px rgba(0,180,255,.5)', whiteSpace:'nowrap' }}>
          👁️ Viendo como jugador · tocá para volver a admin
        </div>
      )}

      <div className="page-content">
        {tab === 'inicio'    && <HomePage    ctx={ctx} onNavigate={setTab} />}
        {tab === 'jugadores' && <PlayersPage ctx={ctx} />}
        {tab === 'partido'   && <MatchPage   ctx={ctx} />}
        {tab === 'historial' && <HistoryPage ctx={ctx} />}
        {tab === 'ranking'   && <RankingPage ctx={ctx} />}
        {tab === 'tienda'    && <ShopPage     ctx={ctx} />}
        {tab === 'conv'      && <ConvPage    ctx={ctx} />}
        {tab === 'perfil'    && <ProfilePage ctx={ctx} />}
      </div>
      <NavBar active={tab} onChange={setTab} />
    </div>
  );
}

export default function MainLayout() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
