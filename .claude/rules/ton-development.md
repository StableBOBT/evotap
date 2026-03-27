# Reglas de Desarrollo TON

## Estructura de Proyecto

```
Usar monorepo con pnpm workspaces:
/apps       - Aplicaciones deployables
/packages   - Codigo compartido
/contracts  - Smart contracts
```

## Smart Contracts

### Standards

- Jettons: TEP-74 (fungible tokens)
- NFTs: TEP-62 (si aplica)
- Metadata: TEP-64

### Testing

```bash
# Siempre testear en testnet primero
npx blueprint test
npx blueprint run --testnet

# Solo despues de verificar
npx blueprint run --mainnet
```

### Deploy Checklist

```
[ ] Tests pasando
[ ] Testnet deploy exitoso
[ ] Funciones admin verificadas
[ ] Gas estimado
[ ] Direcciones documentadas
```

## Mini App SDK

### Preferir @tma.js/sdk

```typescript
// Usar hooks oficiales
import { useTelegram } from './hooks/useTelegram';

// NO usar window.Telegram directamente si hay SDK
```

### Themes

Respetar tema del usuario:

```css
:root {
  --bg-color: var(--tg-theme-bg-color, #1a1a1a);
  --text-color: var(--tg-theme-text-color, #ffffff);
}
```

## TON Connect

### Manifest Obligatorio

```json
{
  "url": "https://...",
  "name": "...",
  "iconUrl": "https://.../icon.png"
}
```

Debe ser accesible publicamente sin CORS.

### Return URL

```tsx
<TonConnectUIProvider
  actionsConfiguration={{
    twaReturnUrl: 'https://t.me/BOT_NAME'
  }}
>
```

## API Design

### Autenticacion

Todas las rutas protegidas requieren initData validado:

```typescript
app.use('/api/*', validateInitDataMiddleware);
```

### Respuestas

```typescript
// Exito
{ success: true, data: {...} }

// Error
{ success: false, error: "mensaje", code: "ERROR_CODE" }
```

### Versionado

```
/api/v1/game/tap
/api/v1/user/stats
```

## Base de Datos

### Indices

Crear indices para queries frecuentes:

```sql
CREATE INDEX idx_users_points ON users(points DESC);
CREATE INDEX idx_users_referrer ON users(referrer_id);
```

### Transacciones

Usar transacciones para operaciones atomicas:

```typescript
await db.transaction(async (tx) => {
  await tx.users.increment(userId, { points: 100 });
  await tx.transactions.create({ userId, amount: 100, type: 'tap' });
});
```

## Redis

### Prefijos de Keys

```
session:     - Sesiones de usuario
leaderboard: - Rankings
ratelimit:   - Rate limiting
cache:       - Cache general
```

### TTLs

```
Sessions: 24h
Cache: 5min
Rate limits: segun config
```

## Logging

### Niveles

```
ERROR: Fallos criticos
WARN:  Problemas potenciales
INFO:  Eventos importantes
DEBUG: Solo en desarrollo
```

### No Loggear

- Tokens/secrets
- Datos personales sensibles
- initData completo

## Performance

### Frontend

```
- Code splitting por rutas
- Lazy loading de componentes pesados
- Imagenes optimizadas (WebP)
- Minificacion en produccion
```

### Backend

```
- Caching agresivo
- Connection pooling
- Queries optimizados
- Compression habilitado
```

## Git

### Branches

```
main     - Produccion
develop  - Desarrollo
feature/ - Features nuevos
fix/     - Bug fixes
```

### Commits

```
feat(game): add streak bonus system
fix(api): validate energy before tap
docs: update deployment guide
```

### NO Commitear

```
.env
.env.local
node_modules/
dist/
*.log
```
