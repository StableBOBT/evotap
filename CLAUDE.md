# TON Mini App Bolivia - Config

## Stack Tecnologico 2026 (Best Practices)

```
FRONTEND:   React 19 + Vite 6 + TailwindCSS
UI:         @telegram-apps/telegram-ui (TelegramUI)
SDK:        @tma.js/sdk-react@3.x + @tonconnect/ui-react@2.x
BOT:        grammY (moderno, TypeScript, serverless-ready)
BACKEND:    Node.js 22 + Fastify/Hono
DATABASE:   Supabase (PostgreSQL) + Upstash (Redis serverless)
DEPLOY:     Vercel (frontend) + Cloudflare Workers (bot/API)
MONOREPO:   Turborepo + pnpm workspaces
TESTING:    Vitest + Playwright
```

## Modelo de Negocio

```
PLATAFORMA:  TON (Telegram Open Network)
TIPO:        Jetton (token nativo TON)
MECANICA:    Tap-to-Earn + Referidos + Squads
COMUNIDAD:   80% tokens (patron Notcoin)
COSTO:       ~$0.33 crear token (vs $240 en BSC)
CAC:         $0.50-2 (vs $10-50 en app stores)
```

## Tokenomics

| Item | Valor | Razon |
|------|-------|-------|
| Supply | 1,000,000,000 | Standard |
| Comunidad/Juego | 80% (800M) | Patron Notcoin (78%) |
| Liquidez | 15% (150M) | DEX inicial |
| Team | 5% (50M) | Vesting 12 meses |

## Distribucion Comunidad (80%)

```
Tap-to-Earn:     50% (500M) - Minado por jugar
Referidos:       20% (200M) - Viralidad (K-factor > 1.3)
Airdrops OG:     10% (100M) - Early adopters + TG Premium
```

## Formula del Exito (Research 2026)

### 1. Engagement Loop
```
Usuario Descubre → Tap Simple → Reward Inmediato
       ↓
Incentivo Compartir → Share en TG → Nuevo Usuario
       ↓
[Loop Viral se repite]
```

### 2. Mecanicas Clave
```
✓ Tap-to-earn simple (enganche inmediato)
✓ Referidos double-sided (+5K puntos ambos)
✓ Squads/Teams (competencia social)
✓ Leaderboards (25% boost retention)
✓ Streaks diarios (habito de retorno)
✓ Promise de airdrop (motivacion largo plazo)
✓ Zero friction (sin descarga, sin registro)
```

### 3. K-Factor Objetivo
```
< 1.0  = Necesitas ads pagados
= 1.0  = Break-even
> 1.3  = Hyper-growth (target minimo)
> 1.5  = Explosivo (Hamster Kombat level)

Hamster Kombat: 15 shares/usuario promedio
```

## Estrategia Launch

### Fase 1: Mini-App MVP (2-3 semanas)
```
1. Bot + Mini App basica (tap-to-earn)
2. Sistema de puntos (no tokens aun)
3. Referidos: +5,000 puntos por invitado
4. Onboarding < 30 segundos
```

### Fase 2: Viralidad (2-4 semanas)
```
1. Squads/Teams + Leaderboards
2. Daily challenges + Streaks
3. Tareas sociales (canal TG, Twitter)
4. Seasons de 2 semanas
```

### Fase 3: Token Launch
```
1. Crear Jetton en minter.ton.org (~$3)
2. Snapshot de puntos
3. Airdrop con criterios claros (aprender de Hamster)
4. Listear en STON.fi
5. NO cambiar reglas de ultimo momento
```

## Benchmarks Apps Exitosas

| App | Usuarios Pico | Shares/User | Factor Clave |
|-----|---------------|-------------|--------------|
| Hamster Kombat | 300M | 15 | YouTube + FOMO |
| Notcoin | 35M | - | Simplicidad extrema |
| Catizen | 34M | - | Merge + $16M IAPs |
| TapSwap | 65M | - | 100% organico |
| Blum | 43M MAU | - | Ex-Binance team |

## Metricas Target

| Metrica | Target Mes 1 | Benchmark |
|---------|--------------|-----------|
| Usuarios | 10,000 | Notcoin: 35M |
| K-factor | > 1.3 | Hamster: ~3.0 |
| Shares/user | 3+ | Hamster: 15 |
| D1 Retention | 20% | Industry: 15-20% |
| D7 Retention | 10% | Industry: 8-10% |
| Session time | 10+ min | Hamster: 52 min |

## Anti-Cheat (CRITICO)

```
Hamster Kombat baneo 2.3M usuarios
Confisco 6.8B tokens

OBLIGATORIO:
├── Validar initData (HMAC-SHA256) en CADA request
├── Rate limit: 10 taps/segundo max
├── Device fingerprinting
├── Behavioral analysis (velocidad, patrones)
├── Nonces unicos anti-replay
└── No revelar todos los criterios de airdrop
```

## Costos Estimados

| Fase | Costo | Tiempo |
|------|-------|--------|
| MVP | $25-100/mes | 2-3 semanas |
| Growth | $100-500/mes | 2-4 semanas |
| Scale | $500-2000/mes | Ongoing |
| Token | ~$3 (Jetton) | 1 dia |

## Links Utiles

```
TON Docs:       docs.ton.org
TMA Docs:       docs.telegram-mini-apps.com
TelegramUI:     github.com/Telegram-Mini-Apps/TelegramUI
grammY:         grammy.dev
Minter:         minter.ton.org
STON.fi:        ston.fi
Supabase:       supabase.com
Upstash:        upstash.com
```

## Repositorio

```
GitHub:  github.com/PrometeoDEV/ton-miniapp-bolivia
Stack:   React + Vite + TON Connect + grammY
License: MIT
```
