import { collection, onSnapshot, addDoc, setDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
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

  // ── Frames ─────────────────────────────────────────────────
  { id:'frame_fire',     category:'frame', name:'Llamas',    emoji:'🔥', price:7,  desc:'Para los que marcan diferencia' },
  { id:'frame_electric', category:'frame', name:'Eléctrico', emoji:'⚡', price:7,  desc:'Velocidad y descarga' },
  { id:'frame_ice',      category:'frame', name:'Hielo',     emoji:'❄️', price:8,  desc:'Frío como el acero' },
  { id:'frame_gold',     category:'frame', name:'Dorado',    emoji:'✨', price:10, desc:'Solo para los mejores' },
  { id:'frame_rainbow',  category:'frame', name:'Rainbow',   emoji:'🌈', price:10, desc:'No hay uno igual' },
  { id:'frame_pulse',    category:'frame', name:'Pulso',     emoji:'💓', price:9,  desc:'Late con energía' },

  // ── Stickers ───────────────────────────────────────────────
  { id:'sticker_fire',   category:'sticker', name:'Fuego',    emoji:'🔥', price:0,  desc:'Clásico ardiente' },
  { id:'sticker_star',   category:'sticker', name:'Estrella', emoji:'⭐', price:3,  desc:'Para los que brillan' },
  { id:'sticker_bolt',   category:'sticker', name:'Rayo',     emoji:'⚡', price:3,  desc:'Velocidad pura' },
  { id:'sticker_crown',  category:'sticker', name:'Corona',   emoji:'👑', price:5,  desc:'Para reyes del campo' },
  { id:'sticker_skull',  category:'sticker', name:'Calavera', emoji:'💀', price:5,  desc:'Para los más temidos' },
  { id:'sticker_lion',   category:'sticker', name:'León',     emoji:'🦁', price:6,  desc:'El rey de la cancha' },
  { id:'sticker_gem',    category:'sticker', name:'Diamante', emoji:'💎', price:8,  desc:'Clase premium' },
  { id:'sticker_dragon', category:'sticker', name:'Dragón',   emoji:'🐉', price:10, desc:'Legendario' },

  // ── Titles (estilo Valorant) ───────────────────────────────
  { id:'title_novato',     category:'title', name:'Novato',         emoji:'🌱', price:0,  desc:'Recién empezando' },
  { id:'title_pibe',       category:'title', name:'El Pibe',        emoji:'🧒', price:5,  desc:'Habilidad natural' },
  { id:'title_centro',     category:'title', name:'Mediocampista',  emoji:'⚙️', price:5,  desc:'Maneja el ritmo' },
  { id:'title_goleador',   category:'title', name:'Goleador',       emoji:'⚽', price:8,  desc:'Sentido del gol' },
  { id:'title_muralla',    category:'title', name:'La Muralla',     emoji:'🧱', price:8,  desc:'No pasa nadie' },
  { id:'title_crack',      category:'title', name:'El Crack',       emoji:'⭐', price:10, desc:'Clase mundial' },
  { id:'title_leyenda',    category:'title', name:'Leyenda',        emoji:'👑', price:15, desc:'Inmortal en la cancha' },

  // ── Titles estilo Valorant (en español) ────────────────────
  { id:'title_rival',       category:'title', name:'Rival',         emoji:'⚔️', price:4,  desc:'Siempre al frente' },
  { id:'title_challenger',  category:'title', name:'Retador',       emoji:'🥊', price:4,  desc:'Vas por todo' },
  { id:'title_contender',   category:'title', name:'Aspirante',     emoji:'🎯', price:5,  desc:'Candidato serio' },
  { id:'title_competitor',  category:'title', name:'Competidor',    emoji:'🏁', price:5,  desc:'Nunca aflojás' },
  { id:'title_threat',      category:'title', name:'Amenaza',       emoji:'⚡', price:6,  desc:'Peligro constante' },
  { id:'title_nemesis',     category:'title', name:'Némesis',       emoji:'😈', price:7,  desc:'La pesadilla del rival' },
  { id:'title_warrior',     category:'title', name:'Guerrero',      emoji:'🛡️', price:6,  desc:'Guerrero de cancha' },
  { id:'title_gladiator',   category:'title', name:'Gladiador',     emoji:'🗡️', price:7,  desc:'Pelea cada pelota' },
  { id:'title_champion',    category:'title', name:'Campeón',       emoji:'🏆', price:10, desc:'Hecho para ganar' },
  { id:'title_mercenary',   category:'title', name:'Mercenario',    emoji:'💰', price:7,  desc:'Juega por la gloria' },
  { id:'title_ace',         category:'title', name:'As',            emoji:'🃏', price:9,  desc:'El as del equipo' },
  { id:'title_clutch',      category:'title', name:'Decisivo',      emoji:'🔥', price:9,  desc:'Aparece cuando importa' },
  { id:'title_headhunter',  category:'title', name:'Cazador',       emoji:'🎯', price:8,  desc:'Precisión letal' },
  { id:'title_marksman',    category:'title', name:'Tirador',       emoji:'🏹', price:7,  desc:'Puntería de élite' },
  { id:'title_sharpshooter',category:'title', name:'Francotirador', emoji:'🎯', price:8,  desc:'No falla una' },
  { id:'title_tactician',   category:'title', name:'Táctico',       emoji:'🧠', price:8,  desc:'Lee el juego' },
  { id:'title_strategist',  category:'title', name:'Estratega',     emoji:'♟️', price:8,  desc:'Mente maestra' },
  { id:'title_duelist',     category:'title', name:'Duelista',      emoji:'⚔️', price:7,  desc:'Encara y define' },
  { id:'title_veteran',     category:'title', name:'Veterano',      emoji:'🎖️', price:9,  desc:'Experiencia pura' },
  { id:'title_elite',       category:'title', name:'Élite',         emoji:'💎', price:11, desc:'Por encima del resto' },
  { id:'title_prime',       category:'title', name:'En su Prime',   emoji:'🌟', price:11, desc:'En su mejor momento' },
  { id:'title_apex',        category:'title', name:'La Cima',       emoji:'🔺', price:13, desc:'Lo más alto' },
  { id:'title_predator',    category:'title', name:'Depredador',    emoji:'🐆', price:12, desc:'Caza cada error' },
  { id:'title_menace',      category:'title', name:'El Terror',     emoji:'☠️', price:10, desc:'Una amenaza andante' },
  { id:'title_goat',        category:'title', name:'El G.O.A.T.',   emoji:'🐐', price:15, desc:'El más grande de todos' },

  // ── Wallpapers (perfil) ────────────────────────────────────
  { id:'wallpaper_cancha',   category:'wallpaper', name:'Cancha clásica', emoji:'🟩', price:0,
    color1:'#0a3d1f', color2:'#0a1a0e', color3:'#000000', angle:135,
    cssBackground:'linear-gradient(135deg, #0a3d1f 0%, #0a1a0e 45%, #000000 100%)',
    desc:'El verde de siempre' },
  { id:'wallpaper_sunset',   category:'wallpaper', name:'Atardecer', emoji:'🌅', price:8,
    color1:'#4a1a3d', color2:'#a83264', color3:'#ff8c42', angle:160,
    cssBackground:'linear-gradient(160deg, #4a1a3d 0%, #a83264 45%, #ff8c42 100%)',
    desc:'Calidez de fin de partido' },
  { id:'wallpaper_space',    category:'wallpaper', name:'Espacio', emoji:'🌌', price:10,
    color1:'#000010', color2:'#1a0a4a', color3:'#4a1a8c', angle:150,
    cssBackground:'linear-gradient(150deg, #000010 0%, #1a0a4a 45%, #4a1a8c 100%)',
    desc:'Para los que vuelan alto' },
  { id:'wallpaper_forest',   category:'wallpaper', name:'Bosque', emoji:'🌲', price:7,
    color1:'#0a2a1a', color2:'#1a4a2a', color3:'#3a6a3a', angle:140,
    cssBackground:'linear-gradient(140deg, #0a2a1a 0%, #1a4a2a 45%, #3a6a3a 100%)',
    desc:'Conexión con la naturaleza' },
];

export const CATEGORIES = [
  { id:'accent',     label:'🎨 Acento',    desc:'Color del OVR y detalles de la carta' },
  { id:'frame',      label:'🖼️ Marco',     desc:'Efecto de borde y glow' },
  { id:'sticker',    label:'🏷️ Sticker',   desc:'Emoji bajo el símbolo de posición' },
  { id:'background', label:'🌌 Fondo de carta', desc:'Fondo de la carta (sobreescribe el tier)' },
  { id:'title',      label:'📛 Título',    desc:'Aparece en tu carta donde va la posición' },
  { id:'wallpaper',  label:'🌅 Wallpaper', desc:'Fondo de tu página de perfil' },
];

// ── Mystery box ───────────────────────────────────────────────
export const MYSTERY_BOX_PRICE = 15;

// ── Module-level singleton (single Firestore listener) ─────────
let _customItems = [];
let _subscribed  = false;
const _listeners = new Set();

// Custom items con el mismo ID que un default sobreescriben al default
function _merge() {
  const map = new Map(DEFAULT_SHOP_ITEMS.map(i => [i.id, i]));
  _customItems.forEach(i => map.set(i.id, i));
  return [...map.values()];
}

function _notify() {
  const all = _merge();
  _listeners.forEach(cb => cb(all));
}

export function subscribeShopItems(cb) {
  _listeners.add(cb);
  cb(_merge());
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

// Crear/sobreescribir un item con ID específico (para overrides de defaults)
export async function setShopItem(id, item) {
  return setDoc(doc(db, 'shopItems', id), { ...item, updatedAt: Date.now() });
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
