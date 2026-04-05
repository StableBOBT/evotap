# 🧪 TON TESTNET - Prueba GRATIS antes de Mainnet

**Costo**: $0 - TODO GRATIS
**Puedes probar**: Crear token, deploy contracts, airdrop, todo

---

## 🎁 PASO 1: OBTENER TON TESTNET GRATIS

### Opción A: TONX API Faucet (Recomendado - cada 12h)
1. **Ir a**: https://faucet.tonxapi.com/
2. Registrar con email
3. Pegar tu wallet address (testnet)
4. Click "Receive TON"
5. **Recibes**: ~2 TON testnet
6. **Refill**: Cada 12 horas

### Opción B: Chainstack Faucet (cada 24h)
1. **Ir a**: https://faucet.chainstack.com/ton-testnet-faucet
2. Registrar cuenta
3. Pegar wallet address
4. **Recibes**: ~1 TON testnet
5. **Refill**: Cada 24 horas

### Opción C: Telegram Bot (más fácil)
1. Buscar: **@testgiver_ton_bot** en Telegram
2. Enviar comando: `/start`
3. Pegar tu wallet address
4. **Recibes**: ~2 TON testnet

### Opción D: GHOST Faucet (sin KYC)
1. **Ir a**: https://ghostchain.io/faucet/ton-testnet/
2. Conectar wallet
3. Claim tokens
4. **Ventaja**: No geo-restrictions

---

## 💼 PASO 2: WALLET PARA TESTNET

### Tonkeeper (Recomendado)

1. **Descargar**: https://tonkeeper.com
2. Crear wallet
3. **Cambiar a Testnet**:
   - Settings → Network
   - Select: **Testnet**
4. Copiar address
5. Ir al faucet y reclamar TON

### MyTonWallet (Alternativa)

1. **Ir a**: https://mytonwallet.io
2. Crear wallet
3. Switch to testnet mode
4. Usar faucet

---

## 🪙 PASO 3: CREAR JETTON EN TESTNET

### Método 1: Minter.ton.org (Más Fácil)

1. **Ir a**: https://minter.ton.org?testnet=true
   - ⚠️ **IMPORTANTE**: Agregar `?testnet=true` al URL
2. **Connect Wallet** (en modo testnet)
3. **Fill Form**:
   ```
   Name: EVO Tap Test
   Symbol: EVOT
   Decimals: 9
   Total Supply: 1,000,000,000
   Image: [Upload PNG]
   Description: Test token para EVO Tap
   ```
4. **Deploy** (cuesta ~0.5 TON testnet)
5. **Guardar**:
   - Jetton Master Address
   - Transaction hash
   - Your admin wallet

**Costo**: ~0.5 TON testnet (GRATIS del faucet)

---

### Método 2: Blueprint CLI (Más Control)

Perfecto para developers que quieren customizar el contrato.

#### Setup:

```bash
# 1. Instalar Blueprint (si no lo tienes)
npm create ton@latest

# 2. O en proyecto existente
cd ton-miniapp-bolivia
mkdir -p contracts/jetton
cd contracts/jetton

# 3. Crear proyecto Blueprint
npx @ton/blueprint create jetton

# 4. Seleccionar template: "Jetton"
```

#### Configurar Testnet:

```typescript
// blueprint.config.ts
import { Config } from '@ton/blueprint';

export const config: Config = {
  network: {
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    type: 'testnet',
    apiKey: 'TU_API_KEY', // Get from https://tonconsole.com
  },
};
```

#### Deploy a Testnet:

```bash
# Build contract
npx blueprint build

# Deploy to testnet
npx blueprint run deployJetton --testnet

# O con custom endpoint:
npx blueprint run deployJetton \
  --custom https://testnet.toncenter.com/api/v2/ \
  --custom-version v2 \
  --custom-type testnet \
  --custom-key <API_KEY>
```

**Preguntas durante deploy**:
```
Name? EVO Tap Test
Symbol? EVOT
Decimals? 9
Total Supply? 1000000000
Admin? [Tu wallet address en testnet]
```

**Output**:
```
✅ Jetton deployed!
Master Address: EQC...xyz
Admin Wallet: EQA...abc
Transaction: https://testnet.tonscan.org/tx/...
```

---

## 🎯 PASO 4: VERIFICAR EN EXPLORER

1. **Ir a**: https://testnet.tonscan.org
2. Buscar tu Jetton Master Address
3. Verificar:
   - Total Supply
   - Admin wallet
   - Metadata (name, symbol)

---

## 🧪 PASO 5: TESTEAR AIRDROP CONTRACT

### Crear Airdrop Contract (Testnet):

```bash
cd contracts/airdrop
npx blueprint create airdrop

# Deploy a testnet
npx blueprint run deployAirdrop --testnet
```

### Transfer Tokens al Contract:

```bash
# Mint tokens al airdrop contract
npx blueprint run mintJettons \
  --testnet \
  --tonconnect \
  --minter EQC...xyz \
  --recipient EQD...airdrop \
  --amount 800000000000000000  # 800M tokens
```

### Testear Claim:

```bash
# Generate merkle tree (con test data)
npx ts-node scripts/generate-test-merkle.ts

# Test claim con tu wallet
npx blueprint run testClaim --testnet
```

---

## 📱 PASO 6: INTEGRAR CON MINI APP

### Actualizar para Testnet:

```typescript
// apps/mini-app/.env.testnet
VITE_TON_NETWORK=testnet
VITE_JETTON_MASTER=EQC...xyz  # Tu jetton de testnet
VITE_AIRDROP_CONTRACT=EQD...  # Tu airdrop contract
VITE_API_URL=https://evotap-api-testnet.andeanlabs-58f.workers.dev
```

### TON Connect Config:

```typescript
// apps/mini-app/src/hooks/useTonConnect.ts
const connector = new TonConnectUI({
  manifestUrl: 'https://ton-miniapp-bolivia.vercel.app/tonconnect-manifest.json',
  network: CHAIN.TESTNET, // ⚠️ Usar TESTNET
});
```

### Testear Claim Flow:

1. Abrir mini app en Telegram
2. Connect wallet (en testnet mode)
3. Ir a Airdrop page
4. Click "Claim"
5. Ver transacción en https://testnet.tonscan.org

---

## ✅ CHECKLIST COMPLETO

### Pre-Deploy:
- [ ] Wallet configurado en testnet
- [ ] Reclamado TON del faucet (2+ TON)
- [ ] Jetton creado en testnet
- [ ] Contract address guardado

### Testing:
- [ ] Jetton visible en testnet explorer
- [ ] Metadata correcta (name, symbol, supply)
- [ ] Transfer funciona (enviar a otra wallet testnet)
- [ ] Airdrop contract deployed
- [ ] Merkle tree generado con test data
- [ ] Claim funciona desde mini app

### Ready for Mainnet:
- [ ] Todo testeado en testnet
- [ ] Smart contracts auditados
- [ ] Frontend integrado y verificado
- [ ] Faucet testnet usado al máximo (aprendiste todo)
- [ ] Ahora sí, conseguir TON real para mainnet

---

## 🔄 WORKFLOW COMPLETO

```
1. Testnet (GRATIS)
   ├─ Get 2 TON from faucet
   ├─ Create EVOT token
   ├─ Deploy airdrop contract
   ├─ Test claim flow
   └─ Iterate hasta que funcione perfecto

2. Mainnet (REAL)
   ├─ Comprar 2 TON ($6-8)
   ├─ Create $EVO token (mismo código)
   ├─ Deploy airdrop contract
   └─ Launch a usuarios reales
```

**Total gastado en testnet**: $0 ✅
**Aprendizaje**: Invaluable ✅

---

## 🆘 TROUBLESHOOTING

### "Transaction failed" en testnet
- Verificar que wallet está en testnet mode
- Verificar balance suficiente (>0.5 TON)
- Revisar logs en tonscan

### "Can't connect wallet"
- Asegurarse TON Connect está en testnet mode
- Verificar manifest URL

### "Insufficient balance"
- Ir al faucet de nuevo (cada 12-24h)
- Probar otro faucet

---

## 📚 RECURSOS

### Faucets:
- [TONX API Faucet](https://faucet.tonxapi.com/) - Cada 12h
- [Chainstack Faucet](https://faucet.chainstack.com/ton-testnet-faucet) - Cada 24h
- [@testgiver_ton_bot](https://t.me/testgiver_ton_bot) - Telegram bot

### Tools:
- [Testnet Minter](https://minter.ton.org?testnet=true)
- [Testnet Explorer](https://testnet.tonscan.org)
- [Blueprint Docs](https://github.com/ton-org/blueprint)
- [TON Testnet Docs](https://docs.ton.org/develop/smart-contracts/environment/testnet)

### Guides:
- [TON Ultimate Guide](https://chainstack.com/ton-ultimate-developer-guide-from-smart-contracts-to-jettons/)
- [Jetton Tutorial](https://docs.ton.org/develop/dapps/tutorials/jetton-minter)
- [Deploy Guide](https://docs.chainstack.com/docs/ton-how-to-develop-fungible-tokens-jettons)

---

## 🎯 VENTAJAS DE TESTEAR PRIMERO

1. **$0 gastado** - Prueba ilimitadamente
2. **Sin riesgo** - Errores no cuestan dinero
3. **Aprende** - Entiende el flujo completo
4. **Itera rápido** - Deploy → test → fix → repeat
5. **Confianza** - Cuando vayas a mainnet, ya sabes qué hacer

---

## 🚀 SIGUIENTE PASO

```bash
# 1. Obtén TON testnet (5 minutos)
# Ir a https://faucet.tonxapi.com/

# 2. Crea tu primer Jetton (10 minutos)
# Ir a https://minter.ton.org?testnet=true

# 3. Integra con tu app (30 minutos)
# Update .env.testnet y test

# 4. Cuando funcione perfecto → Mainnet
```

**¿Listo para probar? Empieza con el faucet ahora mismo.**

---

**Última actualización**: 5 Abril 2026
**Costo**: $0 (TODO GRATIS EN TESTNET)
