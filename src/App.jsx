import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage      from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import MainLayout     from './pages/MainLayout';

export default function App() {
  const { user, onboarded, loading, logout } = useAuth();

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', background:'var(--bg)' }}>
      <div style={{ color:'var(--accent)', fontFamily:'Barlow Condensed, sans-serif',
        fontSize:28, fontWeight:900, letterSpacing:1 }}>
        BalanceFC
      </div>
    </div>
  );

  // Not logged in → login
  if (!user) return (
    <Routes>
      <Route path="*" element={<LoginPage />} />
    </Routes>
  );

  // Logged in but not onboarded → onboarding
  if (!onboarded) return (
    <OnboardingPage user={user} onComplete={() => {}} />
  );

  // Fully onboarded → main app
  return (
    <Routes>
      <Route path="/*" element={<MainLayout />} />
    </Routes>
  );
}
