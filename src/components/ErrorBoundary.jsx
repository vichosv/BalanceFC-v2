import { Component } from 'react';

// Atrapa errores de render para que la app no quede en blanco
// y muestra el mensaje real (útil para diagnosticar).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary capturó:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || String(this.state.error);
      return (
        <div className="page" style={{ textAlign:'center', paddingTop:60 }}>
          <div style={{ fontSize:44, marginBottom:12 }}>⚠️</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22,
            fontWeight:800, marginBottom:8 }}>Algo se rompió en esta sección</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:16 }}>
            Probá recargar. Si sigue, mandale esta captura al admin.
          </div>
          <pre style={{ fontSize:11, color:'var(--red)', background:'var(--surface2)',
            border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px',
            textAlign:'left', overflow:'auto', whiteSpace:'pre-wrap', maxHeight:200 }}>
            {msg}
          </pre>
          <button className="btn btn-ac" style={{ marginTop:16 }}
            onClick={() => window.location.reload()}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
