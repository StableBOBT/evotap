# Backend Deployment - EVO Tap API

## Status: ✅ DEPLOYED

**Date:** 2026-04-05
**Environment:** Mainnet (Production)
**URL:** https://evotap-api.andeanlabs-58f.workers.dev

## Deployment Details

### Cloudflare Worker
- Name: `evotap-api`
- Version ID: `99496e52-f155-48ae-87d5-da4499d884c2`
- Startup Time: 29ms
- Size: 1091 KiB (211 KiB gzipped)

### Configured Secrets
- ✅ BOT_TOKEN
- ✅ UPSTASH_REDIS_REST_URL
- ✅ UPSTASH_REDIS_REST_TOKEN

### Environment Variables
- ENVIRONMENT: mainnet
- TON_NETWORK: mainnet

### Scheduled Triggers
- Cron: `*/5 * * * *` (every 5 minutes)
- Purpose: Sync Redis data to Supabase (when configured)

## Endpoints

### Health Check
```bash
curl https://evotap-api.andeanlabs-58f.workers.dev/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-05T21:32:24.791Z",
  "environment": "mainnet",
  "version": "1.0.0"
}
```

### API Base URL
```
https://evotap-api.andeanlabs-58f.workers.dev/api/v1
```

## Key Features Enabled

✅ Game endpoints (tap, sync, state)
✅ Leaderboard (global, team, daily, weekly)
✅ Team Battle (Colla vs Camba scoring)
✅ Referral system
✅ Anti-cheat (rate limiting, behavioral analysis)
✅ Social tasks verification
✅ Trust score calculation
✅ Airdrop eligibility

## Data Storage

### Primary: Upstash Redis
- Real-time game state
- Leaderboards
- Rate limiting
- Anti-cheat tracking
- Team battle scores

### Optional: Supabase (Not Yet Configured)
- Persistent backups
- Historical data
- Analytics

## Security

✅ CORS configured for Telegram and Vercel domains
✅ Rate limiting (per-user and per-IP)
✅ Nonce validation (anti-replay attacks)
✅ Behavioral analysis (bot detection)
✅ Device fingerprinting

## Next Steps

1. ✅ Backend deployed and running
2. ⏳ Test in Telegram app
3. ⏳ Verify team battle scoring
4. ⏳ Verify leaderboards populate
5. 🔜 Configure Supabase for backups (optional)

## Redeploy Instructions

```bash
cd apps/api
npx wrangler deploy --env mainnet
```

## Update Secrets

```bash
echo "new_value" | npx wrangler secret put SECRET_NAME --env mainnet
```

## Logs

View real-time logs:
```bash
npx wrangler tail --env mainnet
```

---

**Deployed by:** Claude Code
**Documentation:** This file
