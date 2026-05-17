import { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getChallengeState } from '../utils/challenges';
import { useToast } from './ToastProvider';

export default function WeeklyChallenges({ player, matches }) {
  const toast = useToast();
  const [claiming, setClaiming] = useState(null);

  if (!player) return null;

  const challenges = getChallengeState(player, matches);
  const totalDone  = challenges.filter(c => c.done).length;
  const claimable  = challenges.filter(c => c.done && !c.isClaimed).length;

  async function claim(ch) {
    if (!ch.done || ch.isClaimed || claiming) return;
    setClaiming(ch.id);
    try {
      await updateDoc(doc(db, 'players', player.uid), {
        coins: increment(ch.reward),
        [`claimedChallenges.${ch.claimedKey}`]: true,
      });
      toast.coin(`+${ch.reward} 🪙 — ${ch.title}`, { title:'Reto completado', duration:4000 });
    } catch (e) {
      toast.error('No se pudo reclamar el reto');
    } finally {
      setClaiming(null);
    }
  }

  return (
    <div className="card" style={{ marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
        marginBottom:12 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)',
          textTransform:'uppercase', letterSpacing:1 }}>
          🎯 Retos de la semana
        </span>
        <span style={{ fontSize:11, fontWeight:700,
          color: claimable > 0 ? 'var(--accent)' : 'var(--muted)' }}>
          {claimable > 0 ? `${claimable} para reclamar` : `${totalDone}/${challenges.length}`}
        </span>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {challenges.map(ch => {
          const pct = Math.round((ch.current / ch.goal) * 100);
          return (
            <div key={ch.id} style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'10px 12px', borderRadius:10,
              background: ch.isClaimed ? 'rgba(0,230,118,.06)' : 'var(--surface2)',
              border: `1px solid ${ch.done && !ch.isClaimed ? 'var(--accent)'
                : ch.isClaimed ? 'rgba(0,230,118,.3)' : 'var(--border)'}`,
              opacity: ch.isClaimed ? 0.7 : 1,
              transition:'all .15s',
            }}>
              <div style={{ fontSize:22, lineHeight:1, flexShrink:0 }}>{ch.icon}</div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'baseline', marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:700 }}>{ch.title}</span>
                  <span style={{ fontSize:10, color:'var(--muted)' }}>
                    {ch.current}/{ch.goal}
                  </span>
                </div>
                {/* Barra de progreso */}
                <div style={{ height:5, borderRadius:3, background:'var(--border)',
                  overflow:'hidden' }}>
                  <div style={{
                    height:'100%', borderRadius:3,
                    width:`${pct}%`,
                    background: ch.isClaimed ? 'var(--green)'
                      : ch.done ? 'var(--accent)' : 'var(--accent2)',
                    transition:'width .5s cubic-bezier(.4,0,.2,1)',
                  }} />
                </div>
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:3 }}>
                  {ch.desc}
                </div>
              </div>

              {/* Acción / estado */}
              <div style={{ flexShrink:0 }}>
                {ch.isClaimed ? (
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--green)' }}>
                    ✓ 🪙{ch.reward}
                  </span>
                ) : ch.done ? (
                  <button
                    onClick={() => claim(ch)}
                    disabled={claiming === ch.id}
                    style={{
                      padding:'6px 12px', borderRadius:8, border:'none',
                      background:'var(--accent)', color:'#000',
                      fontWeight:800, fontSize:12, cursor:'pointer',
                      whiteSpace:'nowrap',
                    }}>
                    {claiming === ch.id ? '...' : `🪙${ch.reward}`}
                  </button>
                ) : (
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)' }}>
                    🪙{ch.reward}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize:10, color:'var(--muted)', textAlign:'center',
        marginTop:10 }}>
        Se renuevan cada lunes
      </div>
    </div>
  );
}
