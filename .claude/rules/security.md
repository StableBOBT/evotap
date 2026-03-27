# Reglas de Seguridad - TON Mini App

## Validacion de initData (CRITICO)

SIEMPRE validar initData en el backend antes de confiar en datos del usuario.

```typescript
// OBLIGATORIO en cada request autenticado
const isValid = validateInitData(initData, BOT_TOKEN);
if (!isValid) {
  throw new Error('Invalid initData');
}
```

### Verificar auth_date

Rechazar datos mayores a 5 minutos:

```typescript
const authDate = parseInt(params.get('auth_date'));
const now = Math.floor(Date.now() / 1000);
if (now - authDate > 300) {
  throw new Error('Auth data expired');
}
```

## Rate Limiting

### Limites por Accion

| Accion | Limite | Ventana |
|--------|--------|---------|
| Tap | 10 | 1 segundo |
| API general | 60 | 1 minuto |
| Claim/Task | 5 | 1 hora |
| Referral | 100 | 1 dia |

### Implementacion

```typescript
const rateLimiter = new RateLimiter({
  points: 60,
  duration: 60,
  blockDuration: 60,
});

// En middleware
try {
  await rateLimiter.consume(userId);
} catch (e) {
  return res.status(429).json({ error: 'Too many requests' });
}
```

## Anti-Bot

### Deteccion

```
1. Velocidad de taps inhumana (>10/s)
2. Patrones repetitivos exactos
3. Multiples cuentas mismo device
4. IPs de datacenter/VPN
5. User-agents sospechosos
```

### Acciones

```
Sospechoso: Captcha + rate limit estricto
Confirmado: Ban temporal + flag para revision
Reincidente: Ban permanente
```

## Wallets y Fondos

### NUNCA

- Guardar private keys en codigo
- Compartir seed phrases
- Usar wallet personal para proyecto
- Hacer transacciones sin verificar direccion

### SIEMPRE

- Usar variables de entorno para secrets
- Wallet dedicada para el proyecto
- Multisig para fondos grandes
- Verificar direcciones antes de enviar

## Contratos

### Pre-Deploy

```
[ ] Codigo revisado por tercero
[ ] Testnet funcionando
[ ] Casos edge testeados
[ ] Admin functions limitadas
```

### Post-Deploy

```
[ ] Verificar en explorer
[ ] Documentar direcciones
[ ] Monitorear transacciones
[ ] Plan de emergencia definido
```

## Datos de Usuario

### Almacenar

- telegram_id (necesario)
- username (opcional, puede cambiar)
- puntos/energia (necesario)
- wallet_address (cuando conectan)

### NO Almacenar

- Mensajes privados
- Datos de otros chats
- Informacion no necesaria
- Logs con datos sensibles

## Comunicacion HTTPS

```
- Todas las APIs deben usar HTTPS
- Certificados validos (no self-signed en prod)
- HSTS headers habilitados
- No mixed content
```

## Secrets Management

```bash
# .env (NUNCA commitear)
BOT_TOKEN=xxx
DATABASE_URL=xxx
REDIS_URL=xxx
ADMIN_WALLET_SEED=xxx  # Solo si es absolutamente necesario

# En produccion usar:
- Vercel Environment Variables
- Railway Secrets
- AWS Secrets Manager
```

## Respuesta a Incidentes

```
1. Detectar: Monitoreo y alertas
2. Contener: Pausar funciones afectadas
3. Investigar: Logs, traces
4. Remediar: Fix y deploy
5. Comunicar: Informar a usuarios si es necesario
6. Documentar: Post-mortem
```
