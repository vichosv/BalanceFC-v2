import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

// ── Default items (hardcoded base) ─────────────────────────────
export const DEFAULT_SHOP_ITEMS = [

  // ── Accents ────────────────────────────────────────────────
  { id:'accent_cyan',    category:'accent', name:'Cian',       emoji:'🔵', color:'#00e5ff', price:0,  desc:'Color por defecto' },
  { id:'accent_red',     category:'accent', name:'Fuego',      emoji:'🔴', color:'#ff4444', price:0,  desc:'Intensidad pura' },
  { id:'accent_green',   category:'accent', name:'Verde',      emoji:'💚', color:'#00e676', price:0,  desc:'El color del gol' },
  { id:'accent_gold',    category:'accent', name:'Dorado',     emoji:'🌟', color:'#ffd700', price:10, desc:'Brilla como campeón' },
  { id:'accent_purple',  category:'accent', name:'Púrpura',    emoji:'💜', color:'#b44fff', price:5,  desc:'Misterio y clase' },
  { id:'accent_orange',  category:'accent', name:'Naranja',    emoji:'🟠', color:'#ff9100', price:5,  desc:'Energía y potencia' },
  { id:'accent_pink',    category:'accent', name:'Rosa',       emoji:'🩷', color:'#ff4db3', price:7,  desc:'Destacar con estilo' },
  { id:'accent_white',   category:'accent', name:'Blanco',     emoji:'⚪', color:'#ffffff', price:7,  desc:'Elegancia minimalista' },

  // ── Patterns ───────────────────────────────────────────────
  { id:'pattern_carbon',  category:'pattern', name:'Carbon Fiber', emoji:'🔲', price:8,  desc:'Material de alto rendimiento' },
  { id:'pattern_stripes', category:'pattern', name:'Rayas',        emoji:'↗️', price:4,  desc:'Clásico futbolero' },
  { id:'pattern_dots',    category:'pattern', name:'Puntos',       emoji:'⚫', price:4,  desc:'Sutil y distintivo' },
  { id:'pattern_hex',     category:'pattern', name:'Hexágonos',    emoji:'⬡',  price:10, desc:'Tecnología y precisión' },
  { id:'pattern_wave',    category:'pattern', name:'Ondas',        emoji:'〰️', price:6,  desc:'Fluido y dinámico' },

  // ── Frames ─────────────────────────────────────────────────
  { id:'frame_fire',     category:'frame', name:'Llamas',    emoji:'🔥', price:7,  desc:'Para los que marcan diferencia' },
  { id:'frame_electric', category:'frame', name:'Eléctrico', emoji:'⚡', price:7,  desc:'Velocidad y descarga' },
  { id:'frame_ice',      category:'frame', name:'Hielo',     emoji:'❄️', price:8,  desc:'Frío como el acero' },
  { id:'frame_gold',     category:'frame', name:'Dorado',    emoji:'✨', price:10, desc:'Solo para los mejores' },
  { id:'frame_rainbow',  category:'frame', name:'Rainbow',   emoji:'🌈', price:10, desc:'No hay uno igual' },

  // ── Stickers ───────────────────────────────────────────────
  { id:'sticker_fire',   category:'sticker', name:'Fuego',    emoji:'🔥', price:0,  desc:'Clásico ardiente' },
  { id:'sticker_star',   category:'sticker', name:'Estrella', emoji:'⭐', price:3,  desc:'Para los que brillan' },
  { id:'sticker_bolt',   category:'sticker', name:'Rayo',     emoji:'⚡', price:3,  desc:'Velocidad pura' },
  { id:'sticker_crown',  category:'sticker', name:'Corona',   emoji:'👑', price:5,  desc:'Para reyes del campo' },
  { id:'sticker_skull',  category:'sticker', name:'Calavera', emoji:'💀', price:5,  desc:'Para los más temidos' },
  { id:'sticker_lion',   category:'sticker', name:'León',     emoji:'🦁', price:6,  desc:'El rey de la cancha' },
  { id:'sticker_gem',    category:'sticker', name:'Diamante', emoji:'💎', price:8,  desc:'Clase premium' },
  { id:'sticker_dragon', category:'sticker', name:'Dragón',   emoji:'🐉', price:10, desc:'Legendario' },
];

export const CATEGORIES = [
  { id:'accent',     label:'🎨 Acento',   desc:'Color del OVR y detalles de la carta' },
  { id:'pattern',    label:'🔲 Patrón',   desc:'Textura sobre el fondo' },
  { id:'frame',      label:'🖼️ Marco',    desc:'Efecto de borde y glow' },
  { id:'sticker',    label:'🏷️ Sticker',  desc:'Emoji bajo el símbolo de posición' },
  { id:'background', label:'🌌 Fondo',    desc:'Fondo de la carta (sobreescribe el tier)' },
];

// ── Module-level singleton (single Firestore listener) ─────────
let _customItems = [];
let _subscribed  = false;
const _listeners = new Set();

function _notify() {
  const all = [...DEFAULT_SHOP_ITEMS, ..._customItems];
  _listeners.forEach(cb => cb(all));
}

export function subscribeShopItems(cb) {
  _listeners.add(cb);
  cb([...DEFAULT_SHOP_ITEMS, ..._customItems]);
  if (!_subscribed) {
    _subscribed = true;
    onSnapshot(collection(db, 'shopItems'), snap => {
      _customItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _notify();
    });
  }
  return () => _listeners.delete(cb);
}

export async function addShopItem(item) {
  return addDoc(collection(db, 'shopItems'), { ...item, createdAt: Date.now() });
}

export async function updateShopItem(id, patch) {
  return updateDoc(doc(db, 'shopItems', id), patch);
}

export async function deleteShopItem(id) {
  return deleteDoc(doc(db, 'shopItems', id));
}

// ── Backwards compat: keep SHOP_ITEMS exporting current snapshot ─
// (Reads will be defaults + whatever has loaded from Firestore so far)
let _snapshot = [...DEFAULT_SHOP_ITEMS];
subscribeShopItems(items => { _snapshot = items; });
export const SHOP_ITEMS = new Proxy([], {
  get(_, prop) { return _snapshot[prop]; },
  has(_, prop) { return prop in _snapshot; },
  ownKeys()    { return Reflect.ownKeys(_snapshot); },
  getOwnPropertyDescriptor(_, prop) {
    return Object.getOwnPropertyDescriptor(_snapshot, prop);
  },
});
