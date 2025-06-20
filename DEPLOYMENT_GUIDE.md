# AA Wallet Deployment Guide

This guide will help you deploy and interact with the Account Abstraction (AA) Wallet on TON Testnet.

## 🚀 Quick Start

### Prerequisites

1. **Get a TON Wallet**
   - Install [Tonkeeper](https://tonkeeper.com/) or [TON Wallet](https://wallet.ton.org/)
   - Switch to Testnet in wallet settings

2. **Get Test TON**
   - Go to [@testgiver_ton_bot](https://t.me/testgiver_ton_bot) on Telegram
   - Send your testnet wallet address
   - Receive test TON (you'll need at least 0.5 TON)

3. **Install Dependencies**
   ```bash
   yarn install
   ```

### 📦 Build the Contract

```bash
yarn build
```

This compiles your Tact contract and generates TypeScript bindings.

### 🚀 Deploy to Testnet

We provide two deployment methods:

#### Method 1: Simple Deployment (Recommended)

1. Edit `sources/aa_wallet_deploy_simple.ts`:
   ```typescript
   // Replace this line:
   const OWNER_ADDRESS = "YOUR_WALLET_ADDRESS_HERE";
   
   // With your actual wallet address:
   const OWNER_ADDRESS = "0QBM7QssP28PhrctDOyd47_zpFfDiQvv5V9iXizNopb1d8nz";
   ```

2. Run the deployment script:
   ```bash
   yarn deploy:simple
   ```

3. Click the generated deployment link
4. Connect your wallet and confirm the transaction
5. Save the displayed contract address

#### Method 2: Automated Deployment

1. Set your wallet mnemonic as environment variable:
   ```bash
   export WALLET_MNEMONIC="your 24 word mnemonic phrase here"
   ```

2. Edit `sources/aa_wallet.deploy.ts` and update:
   ```typescript
   const DEPLOYER_WALLET_ADDRESS = "YOUR_WALLET_ADDRESS_HERE";
   ```

3. Run:
   ```bash
   yarn deploy
   ```

### 📖 Read Contract State

After deployment, check your contract:

1. Edit `sources/aa_wallet.read.ts` and update the owner address:
   ```typescript
   let owner = Address.parse("YOUR_WALLET_ADDRESS_HERE");
   ```

2. Run:
   ```bash
   yarn read
   ```

### 🔧 Interact with Contract

Use the interaction script to see examples:

1. Edit `sources/aa_wallet_interact.ts`:
   ```typescript
   const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
   const OWNER_ADDRESS = "YOUR_WALLET_ADDRESS";
   ```

2. Run:
   ```bash
   yarn interact
   ```

## 📱 AA Wallet Features

### 1. Session Keys
Allow delegated access with spending limits:
- Add temporary keys for specific operations
- Set expiration times
- Define spending limits
- Track usage

### 2. Gas Sponsorship
Enable gasless transactions:
- Sponsors can deposit TON for gas fees
- Users can execute transactions without TON
- Perfect for onboarding new users

### 3. Multi-signature Support
Execute transactions with different validation methods:
- Owner direct execution
- Session key validation
- Sponsored transaction execution

## 🛠️ Usage Examples

### Add a Session Key
From your wallet, send an `AddSessionKey` message:
```
Public Key: 12345678901234567890
Valid Until: <timestamp>
Spending Limit: 5000000000 (5 TON in nanoTON)
```

### Sponsor Gas
Send a `SponsorGas` message with TON:
```
Amount: 1000000000 (1 TON in nanoTON)
Value: 1.05 TON (to cover fees)
```

### Execute Transaction
Send an `ExecuteTransaction` message:
```
Sequence Number: <current seqno>
Mode: 1
To: <recipient address>
Value: <amount in nanoTON>
```

## 🔍 Troubleshooting

### Common Issues

1. **"Invalid sequence number"**
   - Check current seqno with `yarn read`
   - Use the exact seqno shown

2. **"Insufficient balance"**
   - Ensure contract has enough TON
   - Check sponsor balance if using sponsorship

3. **"Session key expired"**
   - Session keys have time limits
   - Add a new session key with future expiration

### Network Issues

- Testnet endpoint: `https://testnet-v4.tonhubapi.com`
- Mainnet endpoint: `https://mainnet-v4.tonhubapi.com`

## 📚 Next Steps

1. **Test Session Keys**: Add session keys and test delegated access
2. **Test Sponsorship**: Sponsor gas and execute gasless transactions
3. **Build Frontend**: Create a UI for easier interaction
4. **Add Features**: Extend the contract with your requirements

## 🔗 Resources

- [TON Documentation](https://docs.ton.org/)
- [Tact Language](https://tact-lang.org/)
- [TON Testnet Explorer](https://testnet.tonscan.org/)
- [Get Test TON](https://t.me/testgiver_ton_bot)

## 🤝 Support

If you encounter issues:
1. Check the error messages carefully
2. Verify your wallet has testnet TON
3. Ensure you're on the correct network (testnet)
4. Double-check all addresses are correct 