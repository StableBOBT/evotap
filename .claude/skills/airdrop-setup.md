# /airdrop-setup - Configurar Sistema de Airdrop

Skill para configurar y ejecutar airdrops de tokens en TON.

## Trigger

Usuario dice: `/airdrop-setup`, "configurar airdrop", "distribuir tokens", "claim tokens"

## Metodos de Airdrop

### 1. Merkle Airdrop (Recomendado para 1K+ usuarios)

**Ventajas:**
- Costo fijo por usuario (~0.05 TON)
- Escalable a millones
- Usuario paga su propio gas

**Setup:**

```typescript
// Preparar datos
const entries = [
  { address: 'EQ...', amount: toNano('1000') },
  { address: 'EQ...', amount: toNano('500') },
  // ...
];

// Generar Merkle tree
const dict = generateEntriesDictionary(entries);
const merkleRoot = BigInt('0x' + dict.hash().toString('hex'));

// Deploy contrato
const airdrop = Airdrop.createFromConfig({
  merkleRoot,
  helperCode: await compile('AirdropHelper'),
});
```

**Repositorio:** [github.com/Gusarich/airdrop](https://github.com/Gusarich/airdrop)

### 2. Distribucion Directa (<1K usuarios)

```typescript
// Enviar uno por uno
for (const recipient of recipients) {
  await sendJettonTransfer(recipient.address, recipient.amount);
  await sleep(1000); // Evitar rate limit
}
```

### 3. Via Launchpad (Blum, TON of Memes)

Usuarios compran via bonding curve, no es airdrop tradicional.

## Proceso Completo

### Paso 1: Preparar Lista

```csv
telegram_id,wallet_address,points,tokens
12345678,EQabc...,500000,50000
23456789,EQdef...,300000,30000
```

### Paso 2: Calcular Ratio

```
Total puntos: 10,000,000,000
Tokens para airdrop: 500,000,000
Ratio: 1 punto = 0.05 tokens
```

### Paso 3: Deploy Contrato

```bash
# Clonar repo
git clone https://github.com/Gusarich/airdrop
cd airdrop

# Configurar
# Editar scripts/deployAirdrop.ts con tu data

# Deploy
npx blueprint run
```

### Paso 4: Transferir Tokens

```typescript
// Enviar todos los tokens al contrato de airdrop
await jettonWallet.sendTransfer({
  to: airdropContractAddress,
  amount: totalAirdropTokens,
});
```

### Paso 5: Habilitar Claims

```typescript
// En Mini App - pagina de claim
async function handleClaim() {
  const proof = await fetchMerkleProof(userId);

  // Deploy helper personal
  await deployAirdropHelper(proof);

  // Claim tokens
  await claimTokens(proof);
}
```

## UI de Claim

```tsx
function ClaimPage() {
  const { address } = useTonAddress();
  const [claimed, setClaimed] = useState(false);
  const [tokens, setTokens] = useState(0);

  return (
    <div>
      <h1>Reclama tus $EVO</h1>
      <p>Tienes {tokens} tokens disponibles</p>

      {!address ? (
        <TonConnectButton />
      ) : claimed ? (
        <p>Ya reclamaste tus tokens!</p>
      ) : (
        <button onClick={handleClaim}>
          Reclamar {tokens} $EVO
        </button>
      )}
    </div>
  );
}
```

## Comunicacion

### Pre-Airdrop
```
"El airdrop de $EVO esta programado para [FECHA].
Asegurate de conectar tu wallet TON antes."
```

### Durante
```
"El claim esta ACTIVO!
1. Abre la Mini App
2. Ve a la seccion Wallet
3. Conecta tu wallet
4. Toca 'Reclamar'
Gas: ~0.05 TON"
```

### Post-Airdrop
```
"Estadisticas del airdrop:
- Usuarios elegibles: X
- Claims completados: Y
- Tokens distribuidos: Z"
```

## Errores Comunes

| Error | Causa | Solucion |
|-------|-------|----------|
| Not eligible | Usuario no en lista | Verificar criterios |
| Already claimed | Doble claim | Verificar en blockchain |
| Insufficient gas | Poco TON | Usuario necesita ~0.1 TON |
| Invalid proof | Merkle proof malo | Regenerar proofs |
