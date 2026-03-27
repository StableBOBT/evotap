# Arquitectura Tecnica - $EVO Mini App

## Stack Tecnologico

```
FRONTEND:     React + Vite + TailwindCSS + @tma.js/sdk
BACKEND:      Node.js + Express (o Next.js API Routes)
DATABASE:     PostgreSQL (Neon serverless)
CACHE:        Redis (Upstash serverless)
QUEUE:        BullMQ para jobs asincrono
BLOCKCHAIN:   TON Connect + Jetton contracts
HOSTING:      Vercel (frontend) + Railway (backend)
```

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                     TELEGRAM                                 │
│  ┌─────────────┐    ┌─────────────┐                         │
│  │   Bot API   │    │  Mini App   │                         │
│  │ @EVOtapBot  │    │  (WebView)  │                         │
│  └──────┬──────┘    └──────┬──────┘                         │
└─────────┼──────────────────┼────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE CDN                            │
│              (Cache + DDoS Protection)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Frontend    │ │  API Server  │ │  Bot Server  │
│  (Vercel)    │ │  (Railway)   │ │  (Railway)   │
│  React+Vite  │ │  Express/    │ │  Telegraf/   │
│              │ │  Next.js     │ │  grammY      │
└──────────────┘ └──────┬───────┘ └──────┬───────┘
                        │                │
          ┌─────────────┼────────────────┘
          ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │    Redis     │ │   BullMQ     │
│  (Neon)      │ │  (Upstash)   │ │   (Jobs)     │
│  Usuarios    │ │  Sessions    │ │  Airdrops    │
│  Puntos      │ │  Leaderboard │ │  Rewards     │
│  Referidos   │ │  Rate Limit  │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                    TON BLOCKCHAIN                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │   Jetton    │    │   Airdrop   │    │   STON.fi   │       │
│  │   $EVO      │    │   Contract  │    │   (DEX)     │       │
│  └─────────────┘    └─────────────┘    └─────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

---

## Estructura de Proyecto

```
/evo-token-ton
├── /apps
│   ├── /mini-app          # Frontend React
│   │   ├── /src
│   │   │   ├── /components
│   │   │   ├── /hooks
│   │   │   ├── /pages
│   │   │   ├── /stores     # Zustand state
│   │   │   └── /utils
│   │   ├── index.html
│   │   └── vite.config.ts
│   │
│   ├── /api               # Backend Express/Next
│   │   ├── /routes
│   │   ├── /services
│   │   ├── /middleware
│   │   └── /jobs
│   │
│   └── /bot               # Telegram Bot
│       ├── /handlers
│       └── /commands
│
├── /packages
│   ├── /core              # Logica compartida
│   │   ├── /auth
│   │   ├── /points
│   │   └── /referrals
│   │
│   ├── /contracts         # Smart contracts TON
│   │   ├── /jetton
│   │   └── /airdrop
│   │
│   └── /ui                # Componentes compartidos
│
├── /docs
├── /marketing
└── package.json           # Monorepo (pnpm workspaces)
```

---

## Base de Datos (PostgreSQL)

### Schema Principal

```sql
-- Usuarios
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  language_code VARCHAR(10) DEFAULT 'es',
  is_premium BOOLEAN DEFAULT FALSE,

  -- Puntos y energia
  points BIGINT DEFAULT 0,
  energy INT DEFAULT 1000,
  energy_max INT DEFAULT 1000,
  last_energy_update TIMESTAMP DEFAULT NOW(),

  -- Nivel
  level INT DEFAULT 1,
  total_taps BIGINT DEFAULT 0,

  -- Referidos
  referrer_id BIGINT REFERENCES users(telegram_id),
  referral_code VARCHAR(20) UNIQUE,
  referral_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW(),

  -- Wallet (post-TGE)
  wallet_address VARCHAR(100)
);

-- Transacciones de puntos
CREATE TABLE point_transactions (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(telegram_id),
  amount BIGINT NOT NULL,
  type VARCHAR(50) NOT NULL, -- tap, referral, task, bonus
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Referidos (multi-nivel)
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referrer_id BIGINT REFERENCES users(telegram_id),
  referred_id BIGINT REFERENCES users(telegram_id),
  level INT DEFAULT 1, -- 1 = directo, 2 = indirecto
  bonus_earned BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- Tareas completadas
CREATE TABLE completed_tasks (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(telegram_id),
  task_id VARCHAR(50) NOT NULL,
  points_earned BIGINT,
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

-- Streaks
CREATE TABLE streaks (
  user_id BIGINT PRIMARY KEY REFERENCES users(telegram_id),
  current_streak INT DEFAULT 0,
  max_streak INT DEFAULT 0,
  last_claim DATE
);

-- Indices para performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_referrer ON users(referrer_id);
CREATE INDEX idx_users_points ON users(points DESC);
CREATE INDEX idx_transactions_user ON point_transactions(user_id, created_at DESC);
```

---

## Cache (Redis)

### Estructura de Keys

```
# Sesiones
session:{telegram_id} -> JSON (TTL: 24h)
  {
    "user_id": 12345,
    "telegram_id": 67890,
    "level": 3,
    "energy": 850
  }

# Leaderboard (Sorted Set)
leaderboard:global -> ZSET (score = points)
  player:12345 -> 1500000
  player:67891 -> 1200000

leaderboard:weekly -> ZSET (reset domingo)

# Rate Limiting
ratelimit:{telegram_id}:tap -> COUNT (TTL: 1s)
ratelimit:{telegram_id}:api -> COUNT (TTL: 1min)

# Anti-abuse
device:{fingerprint} -> telegram_id (TTL: 30d)

# Cache de datos
user:{telegram_id} -> JSON (TTL: 5min)
stats:global -> JSON (TTL: 1min)
```

### Comandos Frecuentes

```redis
# Actualizar puntos y leaderboard atomicamente
MULTI
HINCRBY user:12345 points 100
ZINCRBY leaderboard:global 100 player:12345
EXEC

# Top 100 leaderboard
ZREVRANGE leaderboard:global 0 99 WITHSCORES

# Ranking del usuario
ZREVRANK leaderboard:global player:12345
```

---

## API Endpoints

### Autenticacion

```
POST /api/auth/init
  Body: { initData: "..." }  # De Telegram
  Response: { token: "jwt...", user: {...} }
```

### Game

```
POST /api/game/tap
  Body: { count: 10, timestamp: 1234567890 }
  Response: { points: 10, energy: 990, level: 1 }

GET /api/game/state
  Response: { points, energy, level, streakDays }

POST /api/game/claim-streak
  Response: { bonus: 10000, newStreak: 7 }
```

### Referidos

```
GET /api/referral/link
  Response: { link: "t.me/EVOtapBot?start=REF_abc123" }

GET /api/referral/stats
  Response: {
    count: 15,
    earnings: 75000,
    referrals: [...]
  }
```

### Leaderboard

```
GET /api/leaderboard?type=global&limit=100
  Response: {
    users: [...],
    userRank: 1234,
    userPoints: 500000
  }
```

### Tasks

```
GET /api/tasks
  Response: { tasks: [...], completed: [...] }

POST /api/tasks/:taskId/complete
  Response: { success: true, points: 10000 }
```

---

## Seguridad

### Validacion de initData (CRITICO)

```typescript
import crypto from 'crypto';

function validateInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  // Ordenar y formar data-check-string
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  // Calcular HMAC
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return computedHash === hash;
}
```

### Rate Limiting

```typescript
// Limites por tipo de accion
const limits = {
  tap: { max: 10, window: '1s' },       // Max 10 taps/segundo
  api: { max: 60, window: '1min' },     // 60 requests/minuto
  claim: { max: 5, window: '1h' }       // 5 claims/hora
};
```

### Anti-Bot Measures

```
1. Rate limiting estricto en taps
2. Device fingerprinting
3. Analisis de patrones (velocidad inhumana)
4. CAPTCHA para acciones sospechosas
5. Honeypots para bots automatizados
```

---

## TON Connect Integration

### Setup

```tsx
// main.tsx
import { TonConnectUIProvider } from '@tonconnect/ui-react';

<TonConnectUIProvider
  manifestUrl="https://evo-token.com/tonconnect-manifest.json"
  actionsConfiguration={{
    twaReturnUrl: 'https://t.me/EVOtapBot'
  }}
>
  <App />
</TonConnectUIProvider>
```

### Manifest

```json
// public/tonconnect-manifest.json
{
  "url": "https://evo-token.com",
  "name": "EVO Token",
  "iconUrl": "https://evo-token.com/icon.png",
  "termsOfUseUrl": "https://evo-token.com/terms",
  "privacyPolicyUrl": "https://evo-token.com/privacy"
}
```

### Claim de Tokens

```tsx
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';

function ClaimButton() {
  const [tonConnectUI] = useTonConnectUI();
  const address = useTonAddress();

  const handleClaim = async () => {
    if (!address) {
      await tonConnectUI.openModal();
      return;
    }

    // Llamar API para claim
    const result = await fetch('/api/claim', {
      method: 'POST',
      body: JSON.stringify({ address })
    });

    // Resultado del claim
  };

  return <button onClick={handleClaim}>Claim $EVO</button>;
}
```

---

## Escalabilidad

### Fase 1: MVP (0-10K usuarios)

```
- Vercel (frontend)
- Railway (backend + bot)
- Neon free tier (PostgreSQL)
- Upstash free tier (Redis)
- Costo: ~$25/mes
```

### Fase 2: Crecimiento (10K-100K usuarios)

```
- + Cloudflare CDN
- Railway Pro (auto-scale)
- Neon Pro ($19/mes)
- Upstash Pro ($10/mes)
- Costo: ~$100-300/mes
```

### Fase 3: Escala (100K+ usuarios)

```
- Multi-region deployment
- Redis Cluster para leaderboards
- PostgreSQL read replicas
- Background workers dedicados
- Costo: ~$500-2000/mes
```

---

## Monitoreo

### Metricas Clave

```
- DAU/MAU
- Taps por usuario/dia
- Conversion de referidos
- Retencion D1, D7, D30
- Latencia de API (p50, p95, p99)
- Errores por minuto
```

### Herramientas Recomendadas

```
- Vercel Analytics (frontend)
- Sentry (error tracking)
- Grafana Cloud (metricas)
- LogDNA/Papertrail (logs)
```

---

## Deployment

### CI/CD (GitHub Actions)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: vercel/actions@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: railwayapp/deploy-action@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
```

---

## Costos Estimados

| Fase | Usuarios | Costo/mes |
|------|----------|-----------|
| MVP | 0-10K | $25-50 |
| Growth | 10K-50K | $100-300 |
| Scale | 50K-100K | $300-800 |
| Viral | 100K+ | $800-2000+ |

---

*Documento interno - Actualizar segun evolucione el proyecto*
