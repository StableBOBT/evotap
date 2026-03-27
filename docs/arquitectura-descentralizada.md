# Arquitectura Descentralizada - TON Mini App

## Principios

```
1. Usuario controla sus datos y assets
2. Logica critica en smart contracts
3. Backend minimo (solo relay/cache)
4. Transparencia total verificable on-chain
5. Sin single point of failure
```

---

## Arquitectura Tradicional vs Descentralizada

### Tradicional (Centralizado)
```
Usuario → Backend (DB) → Smart Contract
          ↓
       [Punto de falla]
       [Control total]
       [Datos privados]
```

### Descentralizada
```
Usuario → Smart Contract (TON) ← Verificable
    ↓
  Wallet (self-custody)
    ↓
  IPFS/TON Storage (datos)
```

---

## Componentes On-Chain

### 1. Game Contract (FunC/Tact)

```
GameContract
├── Estado del jugador (puntos, nivel, energia)
├── Sistema de referidos (on-chain)
├── Leaderboard (top 100)
├── Rewards distribution
└── Admin functions (pausar, upgrade)
```

### 2. Jetton Contract (Token)

```
JettonMaster
├── Mint/Burn controlado
├── Airdrop claims (Merkle)
└── Vesting para team
```

### 3. Airdrop Contract (Merkle)

```
AirdropContract
├── Merkle root de elegibles
├── Claim individual
├── Anti-double-claim
└── Deadline de claim
```

---

## Storage Descentralizado

### Opcion A: TON Storage
```
- Nativo de TON
- Archivos grandes (media, assets)
- Descentralizado y persistente
```

### Opcion B: IPFS
```
- Standard Web3
- Pinning via Pinata/Infura
- Content-addressable
```

### Que Guardar On-Chain vs Off-Chain

| Dato | On-Chain | Off-Chain |
|------|----------|-----------|
| Puntos/Balance | ✓ | Cache |
| Referidos | ✓ | - |
| Perfil usuario | Hash | IPFS |
| Leaderboard | Top 100 | Full en cache |
| Assets/Media | - | IPFS/TON Storage |
| Game state | Checkpoints | Local |

---

## Smart Contract: Game State

### Estructura (Tact)

```tact
contract TapGame {
    owner: Address;
    totalPlayers: Int;

    // Mapeo: Telegram ID -> Estado
    players: map<Int, PlayerState>;

    // Referidos: quien refirio a quien
    referrals: map<Int, Int>;

    // Leaderboard (top 100)
    topPlayers: map<Int, Int>;
}

struct PlayerState {
    points: Int;
    level: Int;
    energy: Int;
    lastTap: Int;      // timestamp
    referrer: Int;     // telegram_id del referidor
    referralCount: Int;
}
```

### Funciones

```tact
// Registrar tap (usuario paga gas)
receive("tap") {
    let player = self.players.get(sender);
    require(player.energy > 0, "No energy");

    player.points += 1;
    player.energy -= 1;
    player.lastTap = now();

    self.players.set(sender, player);
    self.updateLeaderboard(sender, player.points);
}

// Reclamar energia (gratis cada X tiempo)
receive("recharge") {
    let player = self.players.get(sender);
    let elapsed = now() - player.lastTap;
    let recharge = elapsed / 60; // 1 energia por minuto

    player.energy = min(player.energy + recharge, 1000);
    self.players.set(sender, player);
}

// Registrar referido
receive(msg: RegisterReferral) {
    require(self.referrals.get(sender) == null, "Already referred");

    self.referrals.set(sender, msg.referrerId);

    // Bonus para referidor
    let referrer = self.players.get(msg.referrerId);
    referrer.points += 5000;
    referrer.referralCount += 1;
    self.players.set(msg.referrerId, referrer);

    // Bonus para nuevo usuario
    let player = self.players.get(sender);
    player.points += 2500;
    self.players.set(sender, player);
}
```

---

## Flujo de Usuario Descentralizado

### 1. Onboarding
```
1. Usuario abre Mini App
2. Conecta wallet (TON Connect) - OBLIGATORIO
3. Wallet firma registro en contract
4. Estado inicial creado on-chain
5. Ready to play
```

### 2. Gameplay
```
Opcion A: Cada tap on-chain (caro pero trustless)
- Usuario paga ~0.01 TON por tap
- 100% verificable
- Lento para gameplay

Opcion B: Batch commits (recomendado)
- Taps locales por X tiempo
- Commit batch cada 5 min al contract
- Balance: UX + Descentralizacion

Opcion C: Optimistic (rapido)
- Backend acepta taps
- Commit periodico on-chain
- Disputes si hay cheating
```

### 3. Rewards
```
1. Puntos acumulados on-chain
2. Snapshot automatico (block height)
3. Merkle tree generado
4. Usuario claims directo del contract
5. Tokens en su wallet
```

---

## Backend Minimo (Relay)

### Funciones del Backend

```
PERMITIDO:
├── Cache de lecturas (reducir RPC calls)
├── Indexar eventos del contract
├── Notificaciones push
├── API para frontend (read-only)
└── Relay de transacciones (opcional)

NO PERMITIDO:
├── Guardar estado autoritativo
├── Modificar balances
├── Censurar usuarios
└── Acceso a private keys
```

### Arquitectura Relay

```
Mini App (Frontend)
      │
      ├─────────────────────┐
      │                     │
      ▼                     ▼
  TON RPC              Relay Server
  (directo)            (cache/index)
      │                     │
      └──────────┬──────────┘
                 │
                 ▼
          TON Blockchain
          (source of truth)
```

---

## Ventajas Descentralizacion

```
✓ Sin censura - nadie puede banear usuarios
✓ Transparencia - todo verificable on-chain
✓ Self-custody - usuario controla sus tokens
✓ Sin servidor central - no hay punto de falla
✓ Trustless - no necesitas confiar en el team
✓ Inmutable - reglas claras desde el inicio
```

## Desventajas / Trade-offs

```
✗ Gas costs - cada accion cuesta TON
✗ Latencia - blockchain es mas lento que DB
✗ Complejidad - smart contracts son mas dificiles
✗ UX friction - usuario necesita wallet + TON
✗ Escalabilidad - limites de TPS
```

---

## Recomendacion Hibrida

Para Bolivia (usuarios nuevos en crypto):

```
Fase 1: Semi-descentralizado
├── Wallet opcional (puede jugar sin)
├── Puntos en backend (facil onboarding)
├── Claim de tokens requiere wallet
└── Transparencia via proofs publicados

Fase 2: Progresivamente descentralizado
├── Incentivos por conectar wallet
├── Mas features para wallet users
├── Migrar estado a on-chain gradualmente
└── Deprecar features centralizadas

Fase 3: Full descentralizado
├── Wallet obligatorio
├── Todo on-chain
├── Backend solo como relay/cache
└── DAO para governance
```

---

## Stack Descentralizado

```
FRONTEND:     React + TON Connect (obligatorio)
CONTRACTS:    Tact (recomendado) o FunC
STORAGE:      TON Storage / IPFS
INDEXING:     TON Indexer / The Graph (si soporta TON)
BACKEND:      Minimo - solo relay/cache
WALLET:       Tonkeeper / @wallet
```

---

## Costos Estimados On-Chain

| Operacion | Costo Aprox |
|-----------|-------------|
| Deploy contract | ~0.5 TON |
| Registrar usuario | ~0.05 TON |
| Tap (individual) | ~0.01 TON |
| Batch 100 taps | ~0.1 TON |
| Claim airdrop | ~0.05 TON |
| Update leaderboard | ~0.02 TON |

**Nota:** Usuario o proyecto puede pagar gas (gasless transactions posibles con Wallet v5)

---

## Seguridad Contracts

### Checklist

```
[ ] Auditar antes de mainnet
[ ] Testnet exhaustivo
[ ] Ownership renunciable o multisig
[ ] Pausable en emergencia
[ ] Upgrade path definido
[ ] Rate limits on-chain
[ ] Anti-reentrancy
```

### Testing

```bash
# Usar Blueprint para testing
npx blueprint test

# Deploy a testnet primero
npx blueprint run --testnet
```

---

## Recursos

```
Tact Lang:      tact-lang.org
TON Docs:       docs.ton.org
Blueprint:      github.com/ton-org/blueprint
TON Storage:    docs.ton.org/participate/ton-storage
Wallet v5:      github.com/ton-blockchain/wallet-contract-v5
```
