# Reglas de Seguridad - TON Mini App

## Leccion Aprendida: Hamster Kombat

```
Hamster Kombat baneo 2.3M usuarios (5% de 60M)
Confisco 6.8B tokens
Metodos detectados:
├── Bots automatizados
├── Multi-accounting (Sybil)
├── Emuladores de Android
├── Modificacion de requests
└── Farming coordinado
```

**IMPLEMENTAR DESDE EL DIA 1** - No esperar a tener escala.

---

## 1. Validacion initData (CRITICO)

SIEMPRE validar initData en el backend antes de confiar en datos del usuario.

```typescript
import crypto from 'crypto';

function validateInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  // Ordenar alfabeticamente
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  // HMAC-SHA256 con secret derivado
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return calculatedHash === hash;
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

---

## 2. Anti-Sybil (Multi-Cuentas)

### Deteccion

```typescript
interface DeviceFingerprint {
  // Telegram Data
  telegramId: number;
  isPremium: boolean;
  languageCode: string;

  // Device
  userAgent: string;
  screenResolution: string;
  timezone: string;

  // Comportamiento
  firstSeen: Date;
  tapPatterns: number[];  // intervalos entre taps
  sessionDurations: number[];
}

// Clusterar por fingerprint similar
async function detectSybil(userId: number): Promise<boolean> {
  const fingerprint = await getFingerprint(userId);
  const similarUsers = await findSimilarFingerprints(fingerprint);

  // Si hay >3 cuentas con mismo fingerprint = sospechoso
  return similarUsers.length > 3;
}
```

### Reglas de Elegibilidad Airdrop

```
OBLIGATORIO:
├── Cuenta Telegram >30 dias de antiguedad
├── Minimo 10 sesiones diferentes
├── Minimo 7 dias de actividad
├── NO compartir dispositivo con +3 cuentas
└── NO patrones de bot detectados

BONUS:
├── Telegram Premium (+25%)
├── Wallet conectada (+10%)
├── Referidos activos (+5% por cada uno)
└── Participacion en Squads (+15%)
```

---

## 3. Behavioral Analysis

### Patrones Humanos vs Bots

```typescript
interface TapAnalysis {
  intervalsMs: number[];      // Tiempo entre taps
  variance: number;           // Varianza (humanos tienen alta)
  burstPatterns: boolean;     // Rafagas naturales
  pausePatterns: boolean;     // Pausas naturales
}

function analyzeHumanBehavior(taps: TapEvent[]): number {
  const intervals = calculateIntervals(taps);

  // Bots: intervalos muy regulares (baja varianza)
  const variance = calculateVariance(intervals);
  if (variance < 10) return 0.1; // Muy sospechoso

  // Humanos: rafagas seguidas de pausas
  const hasBursts = detectBurstPatterns(intervals);
  const hasPauses = intervals.some(i => i > 2000);

  let score = 0.5;
  if (hasBursts) score += 0.2;
  if (hasPauses) score += 0.2;
  if (variance > 100) score += 0.1;

  return score; // 0 = bot, 1 = humano
}
```

### Metricas a Monitorear

```
SOSPECHOSO:
├── >10 taps/segundo sostenido
├── Sesiones >4 horas continuas
├── Taps mientras app en background
├── Timestamps irregulares (timezone)
└── User-agent de emulador conocido

NORMAL:
├── 3-5 taps/segundo promedio
├── Sesiones de 5-30 minutos
├── Pausas naturales
├── Patrones de uso diurno
└── Mejora gradual (learning curve)
```

---

## 4. Rate Limiting Avanzado

### Limites por Accion

| Accion | Limite | Ventana | Penalidad |
|--------|--------|---------|-----------|
| Tap | 10 | 1 segundo | Warn |
| Tap burst | 50 | 10 segundos | Temp ban 1h |
| API general | 60 | 1 minuto | Slowdown |
| Claim/Task | 5 | 1 hora | Block |
| Referral | 100 | 1 dia | Review |
| Wallet connect | 3 | 1 hora | Block |

### Implementacion con Redis

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Rate limiter sliding window
const tapLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 s'),
  analytics: true,
  prefix: 'ratelimit:tap',
});

// Rate limiter con penalty
const burstLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, '10 s'),
  analytics: true,
  prefix: 'ratelimit:burst',
});

// En el handler
async function handleTap(userId: number) {
  const { success: tapOk } = await tapLimiter.limit(`user:${userId}`);
  const { success: burstOk } = await burstLimiter.limit(`user:${userId}`);

  if (!tapOk) {
    await incrementWarning(userId);
    throw new RateLimitError('Too fast');
  }

  if (!burstOk) {
    await tempBan(userId, 3600); // 1 hora
    throw new BanError('Burst detected');
  }

  // Procesar tap...
}
```

---

## 5. Device Fingerprinting

### Datos a Capturar (Frontend)

```typescript
interface ClientFingerprint {
  // Screen
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  pixelRatio: number;

  // Timezone
  timezone: string;
  timezoneOffset: number;

  // Browser/WebView
  userAgent: string;
  language: string;
  languages: string[];
  platform: string;

  // Capacidades
  touchSupport: boolean;
  maxTouchPoints: number;

  // Canvas fingerprint (hash)
  canvasHash: string;
}

// Generar hash unico
function generateFingerprintHash(fp: ClientFingerprint): string {
  const data = JSON.stringify(fp);
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
}
```

### Deteccion de Emuladores

```typescript
const EMULATOR_INDICATORS = [
  'BlueStacks',
  'Nox',
  'MEmu',
  'LDPlayer',
  'Genymotion',
  'Android SDK',
  'google_sdk',
  'Emulator',
];

function isEmulator(userAgent: string): boolean {
  return EMULATOR_INDICATORS.some(e =>
    userAgent.toLowerCase().includes(e.toLowerCase())
  );
}
```

---

## 6. Sistema de Puntuacion de Confianza

```typescript
interface TrustScore {
  userId: number;
  score: number;        // 0-100
  factors: {
    accountAge: number;     // max 20
    telegramPremium: number; // max 10
    behaviorScore: number;   // max 30
    uniqueDevice: number;    // max 20
    referralQuality: number; // max 10
    walletConnected: number; // max 10
  };
  lastUpdated: Date;
}

// Calcular elegibilidad de airdrop
function calculateAirdropMultiplier(trust: TrustScore): number {
  if (trust.score < 30) return 0;      // No elegible
  if (trust.score < 50) return 0.5;    // 50% del claim
  if (trust.score < 70) return 0.8;    // 80% del claim
  if (trust.score < 90) return 1.0;    // 100% del claim
  return 1.25;                          // 125% bonus (super trustworthy)
}
```

---

## 7. Nonces y Anti-Replay

```typescript
// Cada request de tap debe incluir nonce unico
interface TapRequest {
  nonce: string;       // UUID unico
  timestamp: number;   // Unix timestamp
  taps: number;        // Cantidad de taps
  signature: string;   // HMAC del payload
}

// Validar nonce
async function validateNonce(userId: number, nonce: string): Promise<boolean> {
  const key = `nonce:${userId}:${nonce}`;
  const exists = await redis.exists(key);

  if (exists) {
    return false; // Replay attack
  }

  // Guardar nonce por 1 hora
  await redis.setex(key, 3600, '1');
  return true;
}
```

---

## 8. Merkle Airdrop Anti-Fraude

### Snapshot Seguro

```typescript
// Criterios NO revelados completamente
const HIDDEN_CRITERIA = {
  minSessions: true,        // Revelado: >10 sesiones
  minDays: true,            // Revelado: >7 dias
  behaviorScore: false,     // NO revelado
  referralQuality: false,   // NO revelado
  suspiciousPatterns: false,// NO revelado
};

// Generar Merkle tree solo con usuarios elegibles
async function generateAirdropSnapshot(): Promise<MerkleTree> {
  const eligibleUsers = await db.users.findMany({
    where: {
      trustScore: { gte: 50 },
      createdAt: { lte: subDays(new Date(), 7) },
      sessions: { gte: 10 },
      isBanned: false,
    },
  });

  const leaves = eligibleUsers.map(u => ({
    address: u.walletAddress,
    amount: calculateAmount(u),
  }));

  return new MerkleTree(leaves);
}
```

---

## 9. Wallets y Fondos

### NUNCA

- Guardar private keys en codigo
- Compartir seed phrases
- Usar wallet personal para proyecto
- Hacer transacciones sin verificar direccion
- Revelar admin wallet publicamente

### SIEMPRE

- Usar variables de entorno para secrets
- Wallet dedicada para el proyecto
- Multisig para fondos >$1000
- Verificar direcciones antes de enviar
- Timelock en operaciones grandes

---

## 10. Contratos Descentralizados

### Pre-Deploy Checklist

```
[ ] Codigo revisado por tercero
[ ] Testnet deploy exitoso
[ ] Edge cases testeados
[ ] Admin functions limitadas
[ ] Pausable en emergencia
[ ] Rate limits on-chain
[ ] Anti-reentrancy implementado
[ ] Gas optimizado
```

### Post-Deploy

```
[ ] Verificar en explorer
[ ] Documentar direcciones
[ ] Monitorear transacciones
[ ] Plan de emergencia definido
[ ] Ownership en multisig o renunciado
```

---

## 11. Secrets Management

```bash
# .env (NUNCA commitear)
BOT_TOKEN=xxx
DATABASE_URL=xxx
REDIS_URL=xxx
ADMIN_WALLET_SEED=xxx  # Solo si es absolutamente necesario

# En produccion usar:
- Vercel Environment Variables
- Railway Secrets
- GitHub Secrets (para CI/CD)
- AWS Secrets Manager (para escala)
```

---

## 12. Respuesta a Incidentes

### Protocolo

```
1. DETECTAR
   - Monitoreo de metricas anormales
   - Alertas automaticas
   - Reportes de usuarios

2. CONTENER
   - Pausar funciones afectadas
   - Rate limit agresivo temporal
   - Bloquear IPs/usuarios sospechosos

3. INVESTIGAR
   - Logs y traces
   - Analisis de patrones
   - Identificar alcance

4. REMEDIAR
   - Fix de vulnerabilidad
   - Deploy de emergencia
   - Rollback si necesario

5. COMUNICAR
   - Informar a usuarios si hay impacto
   - Transparencia sobre lo sucedido
   - Timeline de resolucion

6. DOCUMENTAR
   - Post-mortem
   - Acciones preventivas
   - Actualizar reglas
```

### Contactos de Emergencia

```
# Definir antes de launch
- Lead developer: [telegram]
- Security contact: [email]
- Multisig signers: [list]
```

---

## 13. Comunicacion HTTPS

```
- Todas las APIs deben usar HTTPS
- Certificados validos (no self-signed en prod)
- HSTS headers habilitados
- No mixed content
- CSP headers configurados
```

---

## Resumen: Top 5 Prioridades

```
1. Validar initData en CADA request (HMAC-SHA256)
2. Rate limiting desde el dia 1
3. Device fingerprinting + behavioral analysis
4. NO revelar criterios completos de airdrop
5. Sistema de Trust Score para elegibilidad
```
