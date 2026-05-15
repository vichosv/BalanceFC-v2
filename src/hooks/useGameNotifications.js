// Detecta cambios en el jugador y dispara toasts automáticamente
import { useEffect, useRef } from 'react';
import { useToast } from '../components/ToastProvider';
import { useBets } from './useBets';
import { overall, tier } from '../utils/stats';
import { computeLogros } from '../utils/logros';

const TIER_LABELS = {
  iron:'IRON', bronze:'BRONZE', silver:'SILVER', gold:'GOLD',
  emerald:'EMERALD', sapphire:'SAPPHIRE', ruby:'RUBY',
  diamond:'DIAMOND', legend:'LEGEND',
};
const TIER_ORDER = ['iron','bronze','silver','gold','emerald','sapphire','ruby','diamond','legend'];

export function useGameNotifications(player, matches = []) {
  const toast = useToast();
  const { bets } = useBets(player?.uid);

  const prev = useRef({
    coins: null,
    tier: null,
    logroIds: null,
    betStatuses: {},
    initialized: false,
  });

  useEffect(() => {
    if (!player) return;

    // ── Inicialización: no toastear en la primera carga ──
    if (!prev.current.initialized) {
      prev.current.coins = player.coins || 0;
      prev.current.tier  = tier(overall(player));
      // mvpCount para logros
      const mvpCount = computeMvpCount(matches, player.uid);
      const { unlocked } = computeLogros(player, { mvpCount });
      prev.current.logroIds = new Set(unlocked.map(l => l.id));
      prev.current.betStatuses = Object.fromEntries(bets.map(b => [b.id, b.status]));
      prev.current.initialized = true;
      return;
    }

    // ── Monedas ──
    const coins = player.coins || 0;
    if (coins !== prev.current.coins) {
      const delta = coins - prev.current.coins;
      if (delta > 0) {
        toast.coin(`+${delta} ${delta === 1 ? 'gol' : 'goles'}`,
          { title: 'Monedas', duration: 2800 });
      }
      // No toasteamos gastos (ya hay confirmación en los modales)
      prev.current.coins = coins;
    }

    // ── Tier (subió o bajó) ──
    const currentTier = tier(overall(player));
    if (currentTier !== prev.current.tier) {
      const oldIdx = TIER_ORDER.indexOf(prev.current.tier);
      const newIdx = TIER_ORDER.indexOf(currentTier);
      if (newIdx > oldIdx) {
        toast.tier(`Subiste a ${TIER_LABELS[currentTier]}`,
          { title: 'Nuevo rango', duration: 5000 });
      } else if (newIdx < oldIdx) {
        toast.show({
          type:'info', icon:'⬇️',
          title:'Bajaste de rango',
          message:`Ahora eres ${TIER_LABELS[currentTier]}`,
          duration: 4000,
        });
      }
      prev.current.tier = currentTier;
    }

    // ── Logros desbloqueados ──
    const mvpCount = computeMvpCount(matches, player.uid);
    const { unlocked } = computeLogros(player, { mvpCount });
    const currentIds = new Set(unlocked.map(l => l.id));
    unlocked.forEach(l => {
      if (!prev.current.logroIds.has(l.id)) {
        toast.logro(l.name, { title:'Logro desbloqueado', duration: 5000 });
      }
    });
    prev.current.logroIds = currentIds;
  }, [player, matches, bets, toast]);

  // ── Apuestas resueltas ──
  useEffect(() => {
    if (!prev.current.initialized) return;
    bets.forEach(b => {
      const oldStatus = prev.current.betStatuses[b.id];
      if (oldStatus === 'pending' && b.status === 'won') {
        toast.coin(`Apuesta ganada: +${b.amount * 2} 🪙`,
          { title:'🎰 Ganaste', duration: 5000 });
      } else if (oldStatus === 'pending' && b.status === 'lost') {
        toast.show({
          type:'error', icon:'🎰',
          title:'Apuesta perdida',
          message:`Perdiste ${b.amount} 🪙`,
          duration: 4000,
        });
      }
    });
    prev.current.betStatuses = Object.fromEntries(bets.map(b => [b.id, b.status]));
  }, [bets, toast]);
}

function computeMvpCount(matches, uid) {
  return matches.filter(m => {
    if (!m.votes || !Object.keys(m.votes).length) return false;
    if (m.createdAt && Date.now() - m.createdAt < 86400000) return false;
    const counts = {};
    Object.values(m.votes).forEach(v => { if (v.mvp) counts[v.mvp] = (counts[v.mvp]||0)+1; });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] === uid;
  }).length;
}
