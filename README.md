# TON Account Abstraction Wallet

A smart contract wallet implementation on TON blockchain with Account Abstraction.

## Features

- **Session Keys**: Temporary keys with spending limits and expiration times
- **Gas Sponsorship**: Allow third parties to pay for transaction fees
- **Sequence Protection**: Replay attack protection with sequence numbers

## Quick Start

### Prerequisites

- Node.js 18+
- Yarn package manager
- TON testnet wallet with gas

### Installation

```bash
yarn install
```

### Build

```bash
yarn build
```

### Test

```bash
yarn test
```

### Deploy

1. Edit `sources/aa_wallet.deploy.ts` and update:
   ```typescript
   const privateKeyHex = "your_64_byte_private_key";
   const OWNER_ADDRESS = "your_wallet_address";
   ```

2. Run deployment:
   ```bash
   yarn deploy
   ```

3. Click the generated deployment link and confirm in your wallet

## Contract Interface

### Messages

#### ExecuteTransaction
Execute a transaction from the wallet:
```typescript
{
    seqno: number,
    mode: number,
    to: Address,
    value: bigint,
    body: Cell?,
    sessionKeySignature: Slice?
}
```

#### AddSessionKey
Add a temporary session key:
```typescript
{
    publicKey: bigint,
    validUntil: number,
    spendingLimit: bigint
}
```

#### RemoveSessionKey
Remove a session key:
```typescript
{
    publicKey: bigint
}
```

#### SponsorGas
Sponsor gas for transactions:
```typescript
{
    amount: bigint
}
```

## Resources

- [Fork](https://github.com/tact-lang/tact-template)
- [TON Documentation](https://docs.ton.org/)
- [Tact Language](https://tact-lang.org/)
- [TON Testnet Explorer](https://testnet.tonscan.org/)
- [Get Test TON](https://t.me/testgiver_ton_bot)
