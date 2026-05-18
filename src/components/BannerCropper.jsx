import { useState, useRef, useEffect } from 'react';

// Cropper de banner: el usuario elige qué sector de la imagen se usa.
// Salida: dataURL JPEG de outW×outH (3:1 por defecto).
export default function BannerCropper({ file, outW = 1200, outH = 400, onDone, onCancel }) {
  const [src, setSrc]       = useState(null);
  const [nat, setNat]       = useState(null);   // { w, h } naturales
  const [box, setBox]       = useState(null);   // ventana de recorte en px de display
  const [disp, setDisp]     = useState(null);   // tamaño mostrado de la imagen
  const wrapRef = useRef(null);
  const drag    = useRef(null);

  const ratio = outW / outH;

  // Cargar imagen
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setNat({ w: img.width, h: img.height });
      setSrc(url);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Calcular tamaño de display + ventana inicial (centrada, máxima posible)
  useEffect(() => {
    if (!nat || !wrapRef.current) return;
    const maxW = wrapRef.current.clientWidth;
    const dW = maxW;
    const dH = (nat.h / nat.w) * dW;
    setDisp({ w: dW, h: dH });

    // ventana 3:1 más grande que entra
    let bw, bh;
    if (dW / dH > ratio) { bh = dH; bw = bh * ratio; }
    else                 { bw = dW; bh = bw / ratio; }
    setBox({ x: (dW - bw) / 2, y: (dH - bh) / 2, w: bw, h: bh });
  }, [nat, ratio]);

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function onPointerDown(e) {
    e.preventDefault();
    const p = 'touches' in e ? e.touches[0] : e;
    drag.current = { px: p.clientX, py: p.clientY, bx: box.x, by: box.y };
  }
  function onPointerMove(e) {
    if (!drag.current || !box || !disp) return;
    const p = 'touches' in e ? e.touches[0] : e;
    const dx = p.clientX - drag.current.px;
    const dy = p.clientY - drag.current.py;
    setBox(b => ({
      ...b,
      x: clamp(drag.current.bx + dx, 0, disp.w - b.w),
      y: clamp(drag.current.by + dy, 0, disp.h - b.h),
    }));
  }
  function onPointerUp() { drag.current = null; }

  useEffect(() => {
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive:false });
    window.addEventListener('touchend', onPointerUp);
    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  });

  function confirm() {
    if (!box || !disp || !nat || !src) return;
    // Mapear ventana de display → coords naturales
    const scale = nat.w / disp.w;
    const sx = box.x * scale;
    const sy = box.y * scale;
    const sw = box.w * scale;
    const sh = box.h * scale;
    const canvas = document.createElement('canvas');
    canvas.width = outW; canvas.height = outH;
    const img = new Image();
    img.onload = () => {
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      onDone(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = src;
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:10000, padding:20 }}>
      <div style={{ background:'var(--surface)', borderRadius:18, padding:18,
        width:'100%', maxWidth:380, border:'1px solid var(--border)' }}>
        <div style={{ fontSize:14, fontWeight:800, marginBottom:4 }}>
          Elegí el sector del banner
        </div>
        <div style={{ fontSize:11, color:'var(--muted)', marginBottom:12 }}>
          Arrastrá el recuadro para elegir qué parte de la imagen se usa (3:1).
        </div>

        <div ref={wrapRef} style={{ position:'relative', width:'100%',
          userSelect:'none', touchAction:'none', borderRadius:10, overflow:'hidden',
          background:'#000' }}>
          {src && disp && (
            <>
              <img src={src} alt="" draggable={false}
                style={{ width:disp.w, height:disp.h, display:'block' }} />
              {/* Oscurecer fuera del recuadro */}
              {box && (
                <>
                  <div style={{ position:'absolute', inset:0,
                    background:'rgba(0,0,0,.55)', pointerEvents:'none' }} />
                  <div
                    onMouseDown={onPointerDown}
                    onTouchStart={onPointerDown}
                    style={{
                      position:'absolute',
                      left:box.x, top:box.y, width:box.w, height:box.h,
                      cursor:'grab',
                      boxShadow:'0 0 0 9999px rgba(0,0,0,.55)',
                      border:'2px solid var(--accent)',
                      borderRadius:4,
                    }}>
                    <div style={{ position:'absolute', inset:0,
                      backgroundImage:`url(${src})`,
                      backgroundSize:`${disp.w}px ${disp.h}px`,
                      backgroundPosition:`-${box.x}px -${box.y}px`,
                      pointerEvents:'none' }} />
                  </div>
                </>
              )}
            </>
          )}
          {!src && (
            <div style={{ padding:40, textAlign:'center', color:'var(--muted)',
              fontSize:12 }}>Cargando imagen…</div>
          )}
        </div>

        <div style={{ display:'flex', gap:10, marginTop:14 }}>
          <button onClick={onCancel}
            style={{ flex:1, padding:'10px', borderRadius:10,
              border:'1px solid var(--border)', background:'var(--surface2)',
              color:'var(--text)', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            Cancelar
          </button>
          <button onClick={confirm}
            style={{ flex:2, padding:'10px', borderRadius:10, border:'none',
              background:'var(--accent)', color:'#000', fontWeight:800,
              fontSize:13, cursor:'pointer' }}>
            Usar este sector
          </button>
        </div>
      </div>
    </div>
  );
}
