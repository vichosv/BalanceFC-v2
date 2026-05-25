# BalanceFC — Arquitectura

App web para organizar fútbol de barrio: jugadores, equipos balanceados,
ranking, convocatorias, tienda cosmética y apuestas internas con monedas
("goles").

## Stack en una imagen

```
┌─────────────────────┐   git push   ┌──────────────┐   build/serve   ┌──────────────┐
│ Tu PC               │ ──────────►  │   GitHub     │  ─────────────► │   Vercel     │
│  (código en /src)   │              │ vichosv/...  │   (auto-deploy) │  balancefc.* │
└─────────────────────┘              └──────────────┘                 └──────┬───────┘
                                                                             │ HTTPS
                                                                             ▼
                                                              ┌──────────────────────────┐
                                                              │  Usuario (PWA / Web)     │
                                                              │  React + Vite + SW       │
                                                              └────────┬─────────────────┘
                                                                       │  SDK Firebase
                                                                       ▼
                                                              ┌──────────────────────────┐
                                                              │  Firebase (tu proyecto)  │
                                                              │  • Auth (Google)         │
                                                              │  • Firestore (datos)     │
                                                              │  • Hosting de íconos     │
                                                              └──────────────────────────┘
```

---

## 1. Dónde vive el código y cómo llega al usuario

| Pieza | Qué hace | Dónde |
|-------|----------|-------|
| **Código fuente** | React + Vite. Todo lo visual y la lógica del cliente. | Tu PC + GitHub (`vichosv/BalanceFC-v2`) |
| **GitHub** | Repositorio. Cada `git push` dispara un deploy. | `github.com/vichosv/BalanceFC-v2` |
| **Vercel** | Hostea la app. Compila el proyecto con `npm run build`, sirve los archivos estáticos y la PWA por HTTPS. | URL pública (`balancefc-v2.vercel.app` o similar) |
| **Firebase** | Backend gestionado. Auth + base de datos. Vive en tu cuenta de Google. | Consola Firebase (proyecto v2) |

**Flujo de despliegue:**
1. Editás archivos en `src/` (componentes React) o `firestore.rules`.
2. `git commit` + `git push` a `main`.
3. Vercel detecta el push, corre `npm install` + `npm run build`, y publica los assets nuevos.
4. Los usuarios reciben la versión nueva al recargar (la PWA además se auto-actualiza por el service worker).

**Las reglas de Firestore NO se deployan con Vercel.** Las tenés que publicar manualmente en la consola de Firebase (Firestore → Rules → pegar `firestore.rules` → Publish).

---

## 2. El frontend (React + Vite)

Aplicación SPA. Entrada en `src/main.jsx` → `App.jsx` → `MainLayout.jsx`
(decide qué pestaña mostrar según el estado `tab`).

```
src/
├─ pages/              ← Una por pestaña (HomePage, MatchPage, HistoryPage, etc.)
├─ components/         ← Reusables (PlayerCard, NavBar, EmptyState, modales)
├─ hooks/              ← Lógica de datos (useAuth, useMatches, useShopItems, useBets, etc.)
│                       Cada hook envuelve queries/snapshots de Firestore.
├─ utils/              ← Lógica pura (stats, logros, shop, challenges, teams)
└─ firebase/config.js  ← Credenciales del proyecto Firebase (vars de entorno)
```

**Patrones clave:**
- **Hooks de datos**: cada colección de Firestore tiene un hook con `onSnapshot` que mantiene los datos sincronizados en tiempo real (cualquier cambio en la DB se refleja al instante en todas las pantallas abiertas).
- **`ctx`**: en `MainLayout` se arma un objeto `ctx` con `user`, `isAdmin`, `players`, etc., y se pasa a cada página. Toggle "ver como jugador" se hace acá (anula `isAdmin` temporalmente).
- **PWA**: `vite-plugin-pwa` genera el service worker. El manifest (`favicon.svg` como ícono) hace que se pueda **instalar** en el celular y funcione **offline** (con la app cacheada; los datos siguen necesitando red).
- **Estilo**: Blue Lock — fondo hexagonal global + glassmorphism + animaciones (`fade-up`, `logo-glow`, `pulse-glow` en marcos).

---

## 3. Firebase: Auth + Firestore

**Firebase Auth** maneja el login con Google. Cada usuario logueado tiene un `uid` único.

**Firestore** es la base de datos NoSQL. Cada "colección" es una carpeta de documentos JSON. Estructura actual:

| Colección | Qué guarda |
|-----------|------------|
| `users/{uid}` | Auth-side: `isAdmin`, `onboarded`, `email`. Se crea en el onboarding. |
| `players/{uid}` | Perfil de juego: nickname, posición, foto, stats (vel/tec/def/tir/sta/fis), history (matches/wins/goals/assists), seasons, coins, inventory, equipped, statHistory, status. |
| `matches/{id}` | Cada partido jugado: teamA/B/C, scoreA/B/C, playerStats, votes, videoUrl, mvpAwardedUid, gkAwardedUid. |
| `seasons/{id}` | Temporadas: nombre, status (`active`/`closed`). |
| `convocatorias/{id}` | Próximos partidos: fecha, hora, lugar, confirmados[]. Se auto-borran cuando pasa la hora. |
| `shopItems/{id}` | Items custom de la tienda (los defaults están hardcodeados en `utils/shop.js`). Pueden sobreescribir defaults usando el mismo id. |
| `bets/{id}` | Apuestas: uid, tipo, monto, status (pending/won/lost). |
| `moments/{id}` | Momentos del partido (golazo/atajada/errado/blooper) con timestamp del video. |

Las **stats acumuladas** (history, seasons.*) y la **evolución de atributos** se actualizan automáticamente al guardar un partido — `useMatches.logMatch()` corre `buildStatUpdates`, `resolveBets` y `applyStatEvolution` en cascada.

---

## 4. Seguridad

**`firestore.rules`** es la única defensa: vive en Firebase y se ejecuta del lado del servidor. Sin reglas, cualquiera con el config del proyecto puede leer/escribir lo que sea.

Lo que **bloquean** las reglas actuales:
- Pumpear stats (vel/tec/def/...) o history.* → solo admin
- Hacerse admin a uno mismo (`isAdmin` field)
- Modificar otros jugadores, partidos, items de tienda, votos ajenos
- Borrar partidos/temporadas/items sin ser admin

Lo que **permiten** al jugador en su propio doc:
`nickname, position, photo, emoji, equipped, inventory, coins, claimedChallenges, status`

Trade-offs conocidos:
- El campo `coins` es self-writable (compras/apuestas/cajas funcionan client-side). Un usuario podría manipularlo. Mitigable con Cloud Functions más adelante.
- Cross-player coin transfer permitido (+1 exacto) para el award de MVP/Arquero.

---

## 5. Por qué cada pieza está donde está

- **Frontend en Vercel**: deploy automático, gratis hasta cierto tráfico, HTTPS automático, CDN global. La app es estática (SPA), no necesita servidor propio.
- **Firebase para datos**: tiempo real (snapshots), auth incluido, sin gestionar servidores ni bases. Free tier alcanza para grupos chicos.
- **PWA**: para que se sienta como app nativa en el celu (ícono en pantalla de inicio, splash, offline) sin pasar por App Store / Play Store.
- **Reglas como código**: `firestore.rules` versionado en git para tener historial y poder revisar cambios, aunque se deploya manualmente.

---

## 6. Cómo cambiar algo (resumen)

| Querés cambiar... | Tocás... | Cómo se publica |
|-------------------|----------|-----------------|
| UI, texto, layout | `src/pages/*` o `src/components/*` | git push → Vercel deploya |
| Lógica de datos | `src/hooks/*` o `src/utils/*` | git push → Vercel |
| Reglas de seguridad | `firestore.rules` | Manual: Firebase Console → Rules → Publish |
| Defaults de la tienda | `src/utils/shop.js` (`DEFAULT_SHOP_ITEMS`) | git push |
| Items custom de tienda | Desde la UI (admin → +Agregar/✏️ editar) | Se guarda en Firestore en vivo |
| Variables de Firebase | `.env` local y vars en Vercel | Re-deploy |

---

*Documento generado para BalanceFC v2 · stack: React 19 + Vite + Firebase + Vercel + PWA*
