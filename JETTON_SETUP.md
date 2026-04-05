# 🪙 Jetton Creation & Airdrop Setup Guide

**Token**: $EVO
**Platform**: TON Blockchain
**Total Supply**: 1,000,000,000 (1 Billion)

---

## 🧪 **IMPORTANTE: PRUEBA EN TESTNET PRIMERO**

**Antes de gastar TON real**, prueba TODO en testnet GRATIS:
- 👉 Ver guía completa: **TESTNET_GUIDE.md**
- ✅ Obtén TON gratis de faucets
- ✅ Crea token de prueba
- ✅ Deploy contracts
- ✅ Test airdrop flow
- ✅ Aprende sin riesgo ($0)

**Solo cuando TODO funcione en testnet → Continúa con esta guía para mainnet**

---

## 📋 PRE-REQUISITOS (MAINNET)

### 1. Wallet TON con Fondos
- Crear wallet: https://ton.org/wallets
- Recomendado: Tonkeeper o MyTonWallet
- **Necesitas ~2 TON** para MVP:
  - Crear Jetton (~0.5-1 TON)
  - Deploy airdrop contract (~0.5-1 TON)
  - Gas para operaciones (~0.5 TON)
- **Para DEX**: +150 TON (liquidez) - Opcional, se puede hacer después

### 2. Obtener TON
- Exchange: Binance, OKX, Bybit (~$6-8 por 2 TON)
- Bridge desde Ethereum
- P2P en Telegram @wallet

### 3. ✅ YA TESTEADO EN TESTNET
- Haber completado TESTNET_GUIDE.md
- Saber que todo funciona
- Tener contracts listos
- Confianza en el proceso

---

## 🎯 PASO 1: CREAR EL JETTON

### Usando Minter.ton.org (Recomendado)

1. **Ir a**: https://minter.ton.org
2. **Conectar Wallet**
3. **Fill Token Details**:
   ```
   Name: EVO Tap
   Symbol: EVO
   Decimals: 9 (standard TON)
   Total Supply: 1,000,000,000
   Description: El token tap-to-earn de Bolivia
   Image: [Upload logo PNG/JPG]
   ```

4. **Características Opcionales**:
   - ☑️ Mintable: NO (supply fijo)
   - ☑️ Burnable: SÍ (para deflación futura)
   - ☑️ Admin transferable: NO (descentralizado)

5. **Preview & Deploy**
   - Review todo
   - Click "Deploy Jetton"
   - Confirmar transacción en wallet
   - **Costo**: ~0.5-1 TON

6. **Guardar Información**:
   ```
   Jetton Master Contract: ton://...
   Jetton Wallet Contract: ton://...
   Admin Address: EQ...
   ```

### Verificación
- Ver en TON Explorer: https://tonscan.org
- Buscar tu Jetton por símbolo: $EVO
- Verificar supply y decimals

---

## 🎁 PASO 2: AIRDROP SMART CONTRACT

### Opción A: Merkle Airdrop (Recomendado para grandes airdrops)

**Ventajas**:
- Gas eficiente
- Provably fair
- Users claim (no spam)
- Anti-front-running

**Implementación**:

1. **Crear Snapshot** (Backend):
   ```typescript
   // apps/api/src/airdrop/snapshot.ts
   const eligibleUsers = await db.users.findMany({
     where: {
       trustScore: { gte: 50 },
       isBanned: false,
       walletAddress: { not: null },
     },
     select: {
       walletAddress: true,
       points: true,
       trustScore: true,
     },
   });

   const allocations = eligibleUsers.map(u => ({
     address: u.walletAddress,
     amount: calculateAllocation(u.points, u.trustScore),
   }));
   ```

2. **Generar Merkle Tree**:
   ```typescript
   import { MerkleTree } from 'merkletreejs';
   import { keccak256 } from 'ethers';

   const leaves = allocations.map(a =>
     keccak256(solidityPack(['address', 'uint256'], [a.address, a.amount]))
   );

   const tree = new MerkleTree(leaves, keccak256, { sort: true });
   const root = tree.getRoot().toString('hex');

   // Save root to database and smart contract
   ```

3. **Deploy Smart Contract**:
   ```bash
   # En apps/contracts/airdrop/
   npx blueprint build
   npx blueprint run deployAirdrop --network mainnet
   ```

   Contract debe tener:
   - Merkle root
   - Jetton master address
   - Claim period (start/end timestamps)
   - Anti-double-claim mapping

4. **Transfer Tokens al Contract**:
   ```bash
   # Transfer 800M EVO (80% community) al airdrop contract
   ```

### Opción B: Direct Transfer (Simple, pero costoso en gas)

Solo recomendado para <1000 usuarios.

```typescript
// Batch transfer script
for (const user of eligibleUsers) {
  await jettonWallet.transfer({
    to: user.walletAddress,
    amount: user.allocation,
    memo: 'EVO Tap Airdrop',
  });
}
```

---

## 📊 TOKENOMICS DISTRIBUTION

| Categoría | % | Tokens | Destino |
|-----------|---|--------|---------|
| **Tap-to-Earn** | 50% | 500M | Airdrop contract (claim by points) |
| **Referrals** | 20% | 200M | Airdrop contract (claim by referrals) |
| **OG Airdrops** | 10% | 100M | Airdrop contract (early players bonus) |
| **Liquidity** | 15% | 150M | DEX (STON.fi) |
| **Team** | 5% | 50M | Multisig (12-month vesting) |

---

## 🔐 PASO 3: SMART CONTRACT CHECKLIST

### Pre-Deploy:
- [ ] Testnet deployment exitoso
- [ ] Unit tests pasando (100% coverage)
- [ ] Security audit (opcional pero recomendado)
- [ ] Verificar math de allocations
- [ ] Confirmar merkle root correcto
- [ ] Documentar todas las funciones admin

### Post-Deploy:
- [ ] Verificar contract en TON Explorer
- [ ] Transfer tokens al contract
- [ ] Verificar balance correcto
- [ ] Testear claim flow con wallet de prueba
- [ ] Publicar contract address y root
- [ ] Anunciar a la comunidad

---

## 🚀 PASO 4: INTEGRACIÓN FRONTEND

### Actualizar API Endpoints

```typescript
// apps/api/src/airdrop/claim.ts
export async function claimAirdrop(
  userId: number,
  walletAddress: string
): Promise<ClaimResponse> {
  // 1. Verificar elegibilidad
  const allocation = await getAllocation(userId);
  if (!allocation) throw new Error('Not eligible');

  // 2. Generar merkle proof
  const proof = tree.getProof(allocation.leaf);

  // 3. Retornar proof para frontend
  return {
    amount: allocation.amount,
    proof: proof.map(p => '0x' + p.data.toString('hex')),
    root: tree.getRoot().toString('hex'),
  };
}
```

### Frontend Claim Button

```typescript
// apps/mini-app/src/pages/Airdrop.tsx
const handleClaim = async () => {
  // 1. Get claim data from API
  const claimData = await api.claimAirdrop(initDataRaw);

  // 2. Build contract message
  const message = {
    address: AIRDROP_CONTRACT_ADDRESS,
    amount: toNano('0.1'), // Gas
    payload: beginCell()
      .storeUint(1, 32) // claim opcode
      .storeCoins(claimData.amount)
      .storeRef(beginCell().storeBuffer(claimData.proof).endCell())
      .endCell(),
  };

  // 3. Send via TON Connect
  await tonConnectUI.sendTransaction({
    validUntil: Date.now() + 5 * 60 * 1000,
    messages: [message],
  });

  // 4. Wait for confirmation
  // 5. Update UI
};
```

---

## 💰 PASO 5: LIQUIDEZ (DEX)

### STON.fi (Recomendado)

1. **Ir a**: https://ston.fi/liquidity
2. **Crear Pool**: TON/EVO
3. **Ratio Inicial**: Definir precio inicial
   - Ejemplo: 1 TON = 1,000,000 EVO
   - Significa 1 EVO = 0.000001 TON
4. **Agregar Liquidez**: 150M EVO + equivalente en TON
5. **Stake LP Tokens**: Para mining rewards (opcional)

### DeDust (Alternativa)

Similar proceso en https://dedust.io

---

## ⏰ TIMELINE RECOMENDADO

### Semana 1: Testing
- Crear Jetton en testnet
- Deploy airdrop contract en testnet
- Test claim flow completo
- Security review

### Semana 2: Mainnet Launch
- Día 1: Deploy Jetton mainnet
- Día 2-3: Deploy airdrop contract
- Día 4: Transfer tokens
- Día 5: Anuncio oficial

### Semana 3: Snapshot & Distribution
- Día 1: Snapshot de usuarios elegibles
- Día 2: Generar merkle tree
- Día 3: Update contract con root
- Día 4-7: Claim period

### Semana 4: Liquidez
- Crear pool en STON.fi
- Agregar liquidez inicial
- Open trading

---

## 📚 RECURSOS

### Docs Oficiales:
- **TON Jetton**: https://docs.ton.org/develop/dapps/defi/tokens
- **TON Minter**: https://minter.ton.org/docs
- **STON.fi Docs**: https://docs.ston.fi
- **TON Connect**: https://docs.ton.org/develop/dapps/ton-connect

### Smart Contracts:
- **Jetton Standard**: https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md
- **Airdrop Example**: https://github.com/ton-blockchain/airdrop-contract
- **Merkle Airdrop**: https://github.com/Uniswap/merkle-distributor

### Tools:
- **TON Explorer**: https://tonscan.org
- **Blueprint**: https://github.com/ton-org/blueprint
- **TON SDK**: https://github.com/ton-org/ton

---

## ⚠️ ADVERTENCIAS

1. **No hay marcha atrás**: Una vez deployado, el supply es final
2. **Gas costs**: Prepara suficiente TON para todas las operaciones
3. **Security**: Revisa el código 10 veces antes de deploy
4. **Timing**: No apures el proceso, mejor hacerlo bien
5. **Comunicación**: Anuncia con anticipación para evitar FUD

---

## 🎯 CRITERIOS DE ELIGIBILIDAD (Sugeridos)

### Must Have (Elimina bots):
- ✅ Trust Score ≥ 50/100
- ✅ Account age ≥ 7 días
- ✅ Mínimo 10 sesiones de juego
- ✅ Wallet conectada
- ✅ No banned

### Multipliers (Aumenta allocation):
- 🔥 Telegram Premium: 1.25x
- 🔥 Early Player (primeros 10K): 1.5x
- 🔥 Top 100 Leaderboard: 2x
- 🔥 Streak ≥30 días: 1.3x
- 🔥 Referrals ≥10: 1.2x

### Base Allocation:
```
allocation = (points / 1000) * trust_score_multiplier * bonuses
```

Ejemplo:
- 100,000 points
- Trust score: 80/100 (1.0x)
- Premium: +25%
- Early player: +50%
- = 100,000 / 1000 * 1.0 * 1.75 = 175 $EVO

---

**Última actualización**: 5 Abril 2026
**Status**: 📝 Documentación completa - Ready to implement
