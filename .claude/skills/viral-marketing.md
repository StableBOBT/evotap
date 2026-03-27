# /viral-marketing - Marketing Viral TON

Skill para implementar estrategias de crecimiento viral.

## Trigger

Usuario dice: `/viral-marketing`, "estrategia viral", "crecer usuarios", "marketing"

## Principios (Leccion Notcoin)

```
35M usuarios con $0 en marketing
94% vinieron de referidos
El juego ES el marketing
```

## Sistema de Referidos

### Estructura Optima

```
Invitador recibe:
├── +5,000 puntos instantaneos
└── +10% de taps del invitado (permanente)

Invitado recibe:
└── +2,500 puntos de bienvenida
```

### Implementacion

```typescript
// Generar link unico
const referralLink = `t.me/${BOT_USERNAME}?start=ref_${telegramId}`;

// Procesar referido
async function processReferral(newUserId, referrerCode) {
  const referrerId = extractReferrerId(referrerCode);

  await db.transaction(async (tx) => {
    // Crear usuario con referrer
    await tx.users.create({
      telegramId: newUserId,
      referrerId: referrerId,
      points: 2500, // Bonus de bienvenida
    });

    // Dar bonus al invitador
    await tx.users.increment(referrerId, { points: 5000 });

    // Registrar relacion
    await tx.referrals.create({
      referrerId,
      referredId: newUserId,
      level: 1,
    });
  });
}
```

### Tracking de Earnings

```typescript
// Cada tap del referido da 10% al invitador
async function processTap(userId, points) {
  const user = await db.users.findOne({ telegramId: userId });

  if (user.referrerId) {
    const referralBonus = Math.floor(points * 0.1);
    await db.users.increment(user.referrerId, { points: referralBonus });
    await db.referrals.increment(
      { referrerId: user.referrerId, referredId: userId },
      { bonusEarned: referralBonus }
    );
  }
}
```

## Gamificacion

### Streaks Diarios

```
Dia 1:  +100 puntos
Dia 2:  +200 puntos
Dia 3:  +400 puntos
Dia 4:  +800 puntos
Dia 5:  +1,600 puntos
Dia 6:  +3,200 puntos
Dia 7:  +10,000 puntos (bonus semanal)
```

### Niveles

```
Nivel 1: Minero       (0 - 10K)      1x puntos
Nivel 2: Sindicalista (10K - 50K)    1.5x puntos
Nivel 3: Cocalero     (50K - 200K)   2x puntos
Nivel 4: Diputado     (200K - 1M)    2.5x puntos
Nivel 5: Presidente   (1M+)          3x puntos
```

### Tareas

| Tarea | Puntos | Frecuencia |
|-------|--------|------------|
| Unirse a canal TG | 10,000 | Una vez |
| Seguir Twitter | 5,000 | Una vez |
| RT del dia | 1,000 | Diario |
| Invitar amigo | 5,000 | Ilimitado |
| Streak 7 dias | 10,000 | Semanal |

## FOMO Tactics

### Countdowns

```jsx
<div className="countdown">
  Token launch en {days} dias {hours}:{minutes}:{seconds}
</div>
```

### Scarcity

```
"Los primeros 1,000 usuarios: 2x puntos"
"Early adopter badge (no disponible despues)"
"Pool limitado - mas usuarios = menos por persona"
```

### Social Proof

```jsx
<div className="social-proof">
  <p>{activeUsers.toLocaleString()} personas minando ahora</p>
  <p>{lastClaim.user} acaba de ganar {lastClaim.points} puntos</p>
</div>
```

## Contenido para Bolivia

### Mensajes que Funcionan

```
Tema economico:
- "Mientras esperabas dolares, podias minar $EVO"
- "El BCB no puede bloquear tu wallet"
- "Mas estable que el peso boliviano" (satirico)

Tema politico (con cuidado):
- "El token que siempre vuelve"
- Memes de Evo (humor, no odio)
```

### Formatos Virales

```
1. Before/After
   "Antes: Filas en el banco"
   "Despues: Taps en Telegram"

2. Screenshots de progreso
   "Dia 1: 0 puntos"
   "Dia 7: 500,000 puntos"

3. Tutoriales 30 segundos
   - Abrir bot
   - Tap tap tap
   - Ver puntos
```

## Metricas a Trackear

```
K-Factor = invitaciones × conversion
Meta: K > 1 (crecimiento viral)

Ejemplo:
- Usuario invita a 5 personas
- 30% se registran
- K = 5 × 0.3 = 1.5 (viral!)
```

### Dashboard

```
Diario:
├── Nuevos usuarios
├── % via referidos
├── Referidos promedio/usuario
└── DAU

Semanal:
├── K-factor
├── Crecimiento %
├── Retencion D7
└── Top referrers
```

## Errores a Evitar

```
NO hacer:
- Prometer dinero ("gana $100")
- Comprar ads antes de producto
- Spamear grupos
- Usar bots para inflar numeros

SI hacer:
- Dejar que el producto hable
- Incentivar compartir organico
- Crear comunidad genuina
- Responder rapido
```
