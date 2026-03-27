# /launch-ton - Lanzamiento de Token TON

Skill para preparar y ejecutar el lanzamiento de un Jetton en TON.

## Trigger

Usuario dice: `/launch-ton`, "lanzar token", "crear jetton", "deploy token"

## Proceso

### 1. Pre-Launch Checklist

```
[ ] Mini App funcionando y testeada
[ ] Comunidad establecida (Telegram, Twitter)
[ ] Tokenomics definidos y documentados
[ ] Wallet de proyecto creada (separada)
[ ] TON suficiente para gas (~5-10 TON)
[ ] Smart contracts auditados/revisados
```

### 2. Crear Jetton

**Opcion A: Via minter.ton.org**
```
1. Ir a minter.ton.org
2. Conectar wallet (Tonkeeper)
3. Configurar:
   - Name: EVO Token
   - Symbol: EVO
   - Decimals: 9
   - Supply: 1,000,000,000
   - Admin: Tu wallet (o renunciar)
4. Deploy (~0.5 TON)
5. Guardar JETTON_MASTER_ADDRESS
```

**Opcion B: Via Blum Memepad**
```
1. Aplicar a Blum Memepad
2. Configurar bonding curve
3. Graduacion automatica a STON.fi al llegar 1,500 TON
```

### 3. Crear Pool de Liquidez

```
1. Ir a STON.fi
2. Pools -> Create Pool
3. Par: $EVO / TON
4. Agregar liquidez inicial
5. Confirmar transaccion
```

### 4. Configurar Airdrop (si aplica)

```
1. Preparar lista de recipients (CSV)
2. Calcular ratio puntos -> tokens
3. Deploy airdrop contract (Merkle)
4. Transferir tokens al contrato
5. Habilitar claims en Mini App
```

### 5. Post-Launch

```
[ ] Verificar en DexScreener
[ ] Postear anuncio oficial
[ ] Monitorear liquidez y volumen
[ ] Responder preguntas en TG
```

## Comandos Utiles

```bash
# Verificar balance de Jetton
tonweb.getJettonWalletBalance(address)

# Ver transacciones
https://tonviewer.com/{JETTON_ADDRESS}

# STON.fi Pool
https://app.ston.fi/pools
```

## Advertencias

- NUNCA compartir seed phrase/private key
- SIEMPRE testear en testnet primero
- VERIFICAR direcciones antes de enviar fondos
- Guardar TODOS los contract addresses
