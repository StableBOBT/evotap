# EVO Tap - TON Mini App Bolivia

Tap-to-earn game on TON blockchain for the Bolivian community.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 6 + TailwindCSS |
| UI | @telegram-apps/telegram-ui |
| SDK | @telegram-apps/sdk-react v3 |
| State | Zustand + TanStack Query |
| Bot | grammY |
| API | Hono (Cloudflare Workers) |
| Database | Supabase (PostgreSQL) |
| Cache | Upstash Redis |
| Deploy | Vercel + Cloudflare Workers |

## Project Structure

```
ton-miniapp-bolivia/
├── apps/
│   ├── mini-app/          # React frontend (Vite)
│   ├── api/               # Hono API (CF Workers)
│   └── bot/               # grammY bot (CF Workers)
├── packages/
│   ├── core/              # Domain logic (DDD)
│   ├── database/          # Supabase repositories
│   ├── cache/             # Redis rate limiting
│   ├── telegram/          # initData validation
│   ├── config/            # Zod env validation
│   └── testing/           # Test utilities
└── contracts/             # TON smart contracts (Tact)
```

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- ngrok (for local Telegram testing)

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

### Local Development

```bash
# Start bot (polling mode)
pnpm dev:bot

# Start mini-app (Vite)
pnpm dev:mini-app

# Start API
pnpm dev:api

# Or all together
pnpm dev:all
```

### Testing with Telegram

1. Start ngrok: `ngrok http 3000`
2. Update `MINI_APP_URL` in `.env.local` with ngrok HTTPS URL
3. Restart the bot
4. Open [@evoliviabot](https://t.me/evoliviabot) and send `/start`

## Environment Variables

See `.env.local.example` for all variables. Key ones:

| Variable | Required | Description |
|----------|----------|-------------|
| BOT_TOKEN | Yes | Telegram bot token from @BotFather |
| MINI_APP_URL | Yes | HTTPS URL of the mini-app |
| SUPABASE_URL | Prod | Supabase project URL |
| SUPABASE_ANON_KEY | Prod | Supabase anon key |
| UPSTASH_REDIS_URL | Prod | Redis for rate limiting |

## Deployment

### Testnet

```bash
pnpm deploy:testnet
```

### Mainnet

```bash
pnpm deploy:mainnet
```

## Architecture

### Clean Architecture + DDD

```
┌─────────────────────────────────────────────────────────────┐
│                      APPS (Deployables)                      │
├─────────────────┬─────────────────┬─────────────────────────┤
│   mini-app/     │     api/        │        bot/             │
└────────┬────────┴────────┬────────┴────────────┬────────────┘
         │                 │                      │
┌────────▼─────────────────▼──────────────────────▼───────────┐
│                    PACKAGES (Shared)                         │
│  @app/core       │ Domain + Use Cases                       │
│  @app/database   │ Supabase repositories                    │
│  @app/cache      │ Redis rate limiting                      │
│  @app/telegram   │ initData validation                      │
│  @app/config     │ Environment validation                   │
└─────────────────────────────────────────────────────────────┘
```

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

## Security

- initData validation with HMAC-SHA256
- Rate limiting (10 taps/sec, burst detection)
- Device fingerprinting
- Trust score system for airdrop eligibility

See `.claude/rules/security.md` for full security guidelines.

## Bot Commands

| Command | Description |
|---------|-------------|
| /start | Welcome message + play button |
| Stats | View your points and level |
| Invite | Get referral link |
| Leaderboard | View rankings |

## License

MIT
