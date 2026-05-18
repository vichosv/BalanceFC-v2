import { toBlob } from 'html-to-image';

// Captura un nodo DOM como imagen y la comparte (Web Share API)
// con fallback a descarga + abrir WhatsApp.
export async function shareNodeAsImage(node, {
  filename = 'balancefc.png',
  text = 'Mira mi carta en BalanceFC ⚽',
} = {}) {
  if (!node) return;

  const blob = await toBlob(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#05080c',
  });
  if (!blob) throw new Error('No se pudo generar la imagen');

  const file = new File([blob], filename, { type: 'image/png' });

  // Web Share API con archivos (móvil → permite elegir WhatsApp)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return; // el usuario canceló
      // si falla, sigue al fallback
    }
  }

  // Fallback: descargar la imagen + abrir WhatsApp con el texto
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}
