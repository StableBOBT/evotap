# EVO Tap - Quick Start Guide

## Prerequisites

- Node.js 22+
- pnpm 9+
- Telegram account
- ngrok (for Telegram testing)

## Setup (5 minutes)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
- `BOT_TOKEN` - Get from [@BotFather](https://t.me/BotFather)
- `MINI_APP_URL` - Will set after starting ngrok

### 3. Start the mini-app

```bash
pnpm dev:mini-app
```

Opens on http://localhost:3000

### 4. Start ngrok tunnel

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://xxxx.ngrok-free.app`)

### 5. Update .env.local

```
MINI_APP_URL=https://xxxx.ngrok-free.app
```

### 6. Start the bot

```bash
pnpm dev:bot
```

### 7. Test in Telegram

1. Open [@evoliviabot](https://t.me/evoliviabot) (or your bot)
2. Send `/start`
3. Tap "🎮 Play EVO Tap"

## Project Structure

```
apps/
├── mini-app/    # React frontend
├── api/         # Hono API
└── bot/         # grammY bot

packages/
├── core/        # Business logic
├── config/      # Environment validation
├── telegram/    # initData validation
├── database/    # Supabase
└── cache/       # Redis
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev:mini-app` | Start frontend (port 3000) |
| `pnpm dev:bot` | Start bot (polling mode) |
| `pnpm dev:api` | Start API (port 8787) |
| `pnpm dev:all` | Start everything |
| `pnpm test` | Run all tests |
| `pnpm build` | Build all packages |

## Deployment

```bash
# Testnet
pnpm deploy:testnet

# Mainnet
pnpm deploy:mainnet
```

## Need Help?

- Check `.claude/SESSION.md` for current project state
- See `CLAUDE.md` for architecture details
- Run `pnpm test` to verify everything works
