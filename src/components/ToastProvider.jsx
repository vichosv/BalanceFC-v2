import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

// Hook público para emitir toasts desde cualquier componente
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

let _id = 0;

const TYPES = {
  success: { color:'#00e676', bg:'rgba(0,230,118,.14)', border:'rgba(0,230,118,.6)' },
  error:   { color:'#ff5252', bg:'rgba(255,82,82,.14)', border:'rgba(255,82,82,.6)' },
  info:    { color:'#00e5ff', bg:'rgba(0,229,255,.12)', border:'rgba(0,229,255,.6)' },
  coin:    { color:'#ffc107', bg:'rgba(255,193,7,.14)', border:'rgba(255,193,7,.65)' },
  tier:    { color:'#b44fff', bg:'rgba(180,79,255,.14)', border:'rgba(180,79,255,.6)' },
  logro:   { color:'#ff9100', bg:'rgba(255,145,0,.14)', border:'rgba(255,145,0,.65)' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const show = useCallback((opts) => {
    const id = ++_id;
    const t = {
      id,
      type:    opts.type    || 'info',
      icon:    opts.icon    || null,
      title:   opts.title   || null,
      message: opts.message || '',
      duration: opts.duration ?? 3500,
    };
    setToasts(prev => [...prev, t]);
    if (t.duration > 0) {
      setTimeout(() => remove(id), t.duration);
    }
    return id;
  }, [remove]);

  // API ergonómica
  const api = {
    show,
    remove,
    success: (msg, opts={}) => show({ type:'success', message: msg, ...opts }),
    error:   (msg, opts={}) => show({ type:'error',   message: msg, ...opts }),
    info:    (msg, opts={}) => show({ type:'info',    message: msg, ...opts }),
    coin:    (msg, opts={}) => show({ type:'coin', icon:'🪙', message: msg, ...opts }),
    tier:    (msg, opts={}) => show({ type:'tier', icon:'⭐', message: msg, ...opts }),
    logro:   (msg, opts={}) => show({ type:'logro',icon:'🏆', message: msg, ...opts }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Stack de toasts (fixed top, centro horizontal) */}
      <div style={{
        position:'fixed', top:12, left:'50%', transform:'translateX(-50%)',
        display:'flex', flexDirection:'column', gap:8,
        zIndex:99999, pointerEvents:'none',
        width:'min(360px, calc(100vw - 24px))',
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>

      <style>{`
        @keyframes toast-in {
          0%   { opacity:0; transform: translateY(-12px) scale(.96); }
          100% { opacity:1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }) {
  const style = TYPES[toast.type] || TYPES.info;
  return (
    <div
      onClick={onClose}
      style={{
        pointerEvents:'auto',
        display:'flex', alignItems:'center', gap:10,
        padding:'10px 14px', borderRadius:12,
        background:`linear-gradient(135deg, var(--surface), ${style.bg})`,
        border:`1px solid ${style.border}`,
        boxShadow:'0 8px 28px rgba(0,0,0,.55)',
        backdropFilter:'blur(10px)',
        cursor:'pointer',
        animation:'toast-in .25s cubic-bezier(.4,0,.2,1)',
      }}>
      {toast.icon && (
        <div style={{ fontSize:22, lineHeight:1, flexShrink:0 }}>{toast.icon}</div>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        {toast.title && (
          <div style={{ fontWeight:800, fontSize:12, color:style.color,
            textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>
            {toast.title}
          </div>
        )}
        <div style={{ fontSize:13, fontWeight:600, color:'var(--text)',
          lineHeight:1.35 }}>
          {toast.message}
        </div>
      </div>
    </div>
  );
}
