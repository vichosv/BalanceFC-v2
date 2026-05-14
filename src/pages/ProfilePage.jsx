export default function ProfilePage({ ctx }) {
  const { user, profile, isAdmin, logout } = ctx;

  return (
    <div className="page">
      <div className="page-title">👤 Mi perfil</div>
      <div className="card" style={{ textAlign:'center', padding:'24px' }}>
        {user?.photoURL && (
          <img src={user.photoURL} alt="avatar"
            style={{ width:72, height:72, borderRadius:'50%', marginBottom:12, border:'3px solid var(--accent)' }} />
        )}
        <div style={{ fontWeight:700, fontSize:18 }}>{user?.displayName}</div>
        <div style={{ color:'var(--muted)', fontSize:13, marginBottom:8 }}>{user?.email}</div>
        {isAdmin && (
          <span style={{ background:'var(--accent)', color:'var(--bg)', borderRadius:6, padding:'2px 10px', fontSize:12, fontWeight:700 }}>
            Admin
          </span>
        )}
        {profile?.playerId ? (
          <div style={{ marginTop:16, color:'var(--green)', fontSize:13 }}>
            ✅ Perfil vinculado a jugador
          </div>
        ) : (
          <div style={{ marginTop:16, color:'var(--muted)', fontSize:13 }}>
            Aún no vinculado a un jugador
          </div>
        )}
        <button className="btn btn-gh" style={{ marginTop:20, width:'100%' }} onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
