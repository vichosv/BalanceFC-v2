import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import MainLayout from './pages/MainLayout';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#080c10' }}>
      <div style={{ color:'#00e5ff', fontFamily:'Barlow Condensed, sans-serif', fontSize:'24px', fontWeight:700 }}>
        BalanceFC
      </div>
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/*"     element={ user  ? <MainLayout /> : <Navigate to="/login" />} />
    </Routes>
  );
}
