# Estrategia de Lanzamiento - $EVO TON

## Resumen

```
Fase 1: Mini-App (2-4 semanas)     → Construir base usuarios
Fase 2: Acumulacion (2-4 semanas) → Viralidad + engagement
Fase 3: TGE (Token Generation)    → Airdrop + DEX listing
Fase 4: Post-Launch               → Comunidad + utilidad
```

---

## Fase 1: Mini-App Telegram

### Objetivo
Crear juego simple que enganche usuarios ANTES del token.

### Implementacion

```
Dia 1-3: Setup
├── Crear bot Telegram (@EVOtapBot)
├── Desarrollar Mini-App basica
├── Sistema de puntos en MongoDB
└── UI: boton tap + contador + energia

Dia 4-7: Features Core
├── Sistema de energia (recarga temporal)
├── Sistema de niveles
├── Leaderboard global
└── Sistema de referidos

Dia 8-14: Polish
├── Animaciones satisfactorias
├── Sonidos de tap
├── Tareas diarias
└── Testing con grupo cerrado
```

### Tech Stack

```javascript
// Mini-App
- React + Vite
- Telegram Mini Apps SDK
- TailwindCSS

// Backend
- Node.js + Express
- MongoDB (usuarios, puntos)
- Redis (leaderboard)

// Bot
- node-telegram-bot-api
- Webhooks
```

### MVP Features

```
[CORE]
✓ Tap para ganar puntos
✓ Energia que se recarga
✓ Referidos con link unico
✓ Leaderboard top 100

[NICE TO HAVE]
○ Boosts (ver anuncio = energia)
○ Tareas (seguir canal = puntos)
○ Streaks diarios
○ Skins/upgrades
```

---

## Fase 2: Acumulacion y Viralidad

### Sistema de Referidos

```
Link unico: t.me/EVOtapBot?start=REF_[USER_ID]

Recompensas:
├── Invitador: +5,000 puntos instantaneos
├── Invitado: +2,500 puntos de inicio
└── Invitador: +10% de taps del invitado (permanente)
```

### Estrategia Viral (Copiada de Notcoin)

```
1. Zero marketing pagado
2. Solo compartir organico
3. Recompensas generosas por referir
4. FOMO: "puntos limitados antes de TGE"
```

### Seasons/Temporadas

```
Season 1 (2 semanas):
├── Objetivo: Primeros 1,000 usuarios
├── Bonus: Early adopters 2x puntos
└── Reward pool: 10% de airdrop

Season 2 (2 semanas):
├── Objetivo: 5,000 usuarios
├── Bonus: Competencia por equipo
└── Reward pool: 20% de airdrop
```

### Tareas para Puntos

```
Tarea                    Puntos    Frecuencia
─────────────────────────────────────────────
Unirse a canal TG        10,000    Una vez
Seguir Twitter           5,000     Una vez
RT del dia               1,000     Diario
Invitar amigo            5,000     Ilimitado
Streak 7 dias            10,000    Semanal
```

---

## Fase 3: Token Generation Event (TGE)

### Opcion A: Launch Directo

```
1. Crear Jetton en minter.ton.org
   - Costo: ~0.5 TON ($3)
   - Supply: 1,000,000,000

2. Crear pool en STON.fi
   - Par: $EVO/TON
   - Liquidez inicial: 15% supply + X TON

3. Airdrop a usuarios
   - Snapshot de puntos
   - Ratio: 1 punto = 0.X $EVO
   - Claim via Mini-App
```

### Opcion B: Via Blum Memepad

```
1. Aplicar a Blum Memepad
   - Necesita: Comunidad activa, producto

2. Bonding curve sale
   - Usuarios compran con TON
   - Precio sube con demanda

3. Graduacion a STON.fi
   - Al llegar 1,500 TON
   - LP automatico
   - LP tokens quemados
```

### Conversion de Puntos

```
Total puntos en circulacion: X
Tokens para airdrop: 500,000,000 (50%)

Ratio = 500,000,000 / X

Ejemplo:
- 10,000 usuarios
- Promedio 500,000 puntos c/u
- Total: 5,000,000,000 puntos
- Ratio: 1 punto = 0.1 $EVO
- Usuario promedio: 50,000 $EVO
```

### Claim Process

```
1. Usuario abre Mini-App
2. Ve sus puntos finales
3. Conecta wallet TON (Tonkeeper/@wallet)
4. Claim tokens (gas ~$0.01)
5. Tokens en su wallet
```

---

## Fase 4: Post-Launch

### Primera Semana

```
Dia 1-2: Estabilizacion
├── Monitorear liquidity
├── Responder preguntas
├── Fix bugs de claim

Dia 3-5: Marketing
├── Verificar en DexScreener
├── Postear en Twitter/TG
├── Celebrar milestones

Dia 6-7: Siguiente fase
├── Anunciar Season 2
├── Nuevas mecanicas
├── Staking? Burning?
```

### Retencion Post-TGE

```
El problema: Usuarios venden y se van

Solucion (copiada de Hamster):
1. Mas seasons con mas rewards
2. Staking para boost de minado
3. NFTs exclusivos para holders
4. Utilidad real (pagos en TG?)
```

---

## Timeline Completo

```
Semana 1-2:   Desarrollo Mini-App
Semana 3:     Beta cerrada (100 usuarios)
Semana 4-5:   Launch publico Season 1
Semana 6-7:   Season 2 + viralidad
Semana 8:     TGE + Airdrop
Semana 9+:    Post-launch, Season 3
```

---

## Costos Estimados

| Item | Costo |
|------|-------|
| Servidor (VPS) | ~$5/mes |
| Dominio | ~$12/año |
| Crear Jetton | ~$3 |
| LP inicial | Variable |
| **Total minimo** | **~$25** |

vs BSC: ~$360 minimo

---

## Metricas a Trackear

```
Pre-TGE:
├── Usuarios totales
├── DAU (daily active users)
├── Referidos/usuario
├── Retencion D1, D7
└── Puntos totales minados

Post-TGE:
├── Holders
├── Volume 24h
├── Precio
├── LP depth
└── Claims completados
```

---

## Riesgos y Mitigacion

| Riesgo | Mitigacion |
|--------|------------|
| Bots/abuse | Captcha, rate limit, analisis |
| Bajo engagement | Mejorar UX, mas rewards |
| Dump post-TGE | Vesting parcial, utilidad |
| Competencia | Mover rapido, comunidad fuerte |

---

*Documento interno - No compartir*
