import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell, Address } from '@ton/core';
import { AAWallet } from './output/aa_wallet_AAWallet';
import { keyPairFromSecretKey } from '@ton/crypto';
import '@ton/test-utils';

describe('AAWallet', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let owner: SandboxContract<TreasuryContract>;
    let user: SandboxContract<TreasuryContract>;
    let sponsor: SandboxContract<TreasuryContract>;
    let aaWallet: SandboxContract<AAWallet>;

    const generateTestPrivateKey = (): Buffer => {
        const privateKey = Buffer.alloc(64);
        for (let i = 0; i < 64; i++) {
            privateKey[i] = Math.floor(Math.random() * 256);
        }
        return privateKey;
    };

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        
        owner = await blockchain.treasury('owner');
        user = await blockchain.treasury('user');
        sponsor = await blockchain.treasury('sponsor');
        deployer = await blockchain.treasury('deployer');

        aaWallet = blockchain.openContract(
            await AAWallet.fromInit(owner.address)
        );

        const deployResult = await aaWallet.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: aaWallet.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy correctly', async () => {
        const seqno = await aaWallet.getSeqno();
        expect(seqno).toBe(0n);
    });

    it('should accept funds', async () => {
        const result = await aaWallet.send(
            user.getSender(),
            {
                value: toNano('1'),
            },
            null
        );

        expect(result.transactions).toHaveTransaction({
            from: user.address,
            to: aaWallet.address,
            success: true,
        });
    });

    it('should allow owner to execute transactions', async () => {
        await aaWallet.send(
            owner.getSender(),
            {
                value: toNano('2'),
            },
            null
        );

        const result = await aaWallet.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'ExecuteTransaction',
                seqno: 0n,
                mode: 1n,
                to: user.address,
                value: toNano('1'),
                body: null,
                sessionKeySignature: null,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: aaWallet.address,
            to: user.address,
            value: toNano('1'),
            success: true,
        });

        const seqno = await aaWallet.getSeqno();
        expect(seqno).toBe(1n);
    });

    it('should reject transaction with wrong seqno', async () => {
        const result = await aaWallet.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'ExecuteTransaction',
                seqno: 10n,
                mode: 1n,
                to: user.address,
                value: toNano('1'),
                body: null,
                sessionKeySignature: null,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: owner.address,
            to: aaWallet.address,
            success: false,
            exitCode: 11749,
        });
    });

    it('should allow adding and using session keys', async () => {
        const testPrivateKey = generateTestPrivateKey();
        const testKeyPair = keyPairFromSecretKey(testPrivateKey);
        const sessionKeyPubKey = BigInt('0x' + testKeyPair.publicKey.toString('hex'));
        const validUntil = BigInt(Math.floor(Date.now() / 1000) + 3600);
        
        const addKeyResult = await aaWallet.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'AddSessionKey',
                publicKey: sessionKeyPubKey,
                validUntil: validUntil,
                spendingLimit: toNano('5'),
            }
        );

        expect(addKeyResult.transactions).toHaveTransaction({
            from: owner.address,
            to: aaWallet.address,
            success: true,
        });

        const sessionKey = await aaWallet.getSessionKey(sessionKeyPubKey);
        expect(sessionKey).toBeDefined();
        expect(sessionKey?.publicKey).toBe(sessionKeyPubKey);
        expect(sessionKey?.spendingLimit).toBe(toNano('5'));
        expect(sessionKey?.spent).toBe(0n);
    });

    it('should allow gas sponsorship', async () => {
        const sponsorResult = await aaWallet.send(
            sponsor.getSender(),
            {
                value: toNano('1'),
            },
            {
                $$type: 'SponsorGas',
                amount: toNano('1'),
            }
        );

        expect(sponsorResult.transactions).toHaveTransaction({
            from: sponsor.address,
            to: aaWallet.address,
            success: true,
        });

        const sponsorBalance = await aaWallet.getSponsorBalance(sponsor.address);
        expect(sponsorBalance).toBe(toNano('1'));
    });

    it('should execute transaction with gas sponsorship', async () => {
        await aaWallet.send(
            owner.getSender(),
            {
                value: toNano('2'),
            },
            null
        );

        await aaWallet.send(
            sponsor.getSender(),
            {
                value: toNano('0.5'),
            },
            {
                $$type: 'SponsorGas',
                amount: toNano('0.5'),
            }
        );

        const result = await aaWallet.send(
            sponsor.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'ExecuteTransaction',
                seqno: 0n,
                mode: 1n,
                to: user.address,
                value: toNano('1'),
                body: null,
                sessionKeySignature: null,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: aaWallet.address,
            to: user.address,
            value: toNano('1'),
            success: true,
        });
    });

    it('should reject unauthorized transactions', async () => {
        const result = await aaWallet.send(
            user.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'ExecuteTransaction',
                seqno: 0n,
                mode: 1n,
                to: user.address,
                value: toNano('1'),
                body: null,
                sessionKeySignature: null,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: user.address,
            to: aaWallet.address,
            success: false,
            exitCode: 401,
        });
    });

    it('should remove session keys', async () => {
        const testPrivateKey = generateTestPrivateKey();
        const testKeyPair = keyPairFromSecretKey(testPrivateKey);
        const sessionKeyPubKey = BigInt('0x' + testKeyPair.publicKey.toString('hex'));
        
        await aaWallet.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'AddSessionKey',
                publicKey: sessionKeyPubKey,
                validUntil: BigInt(Math.floor(Date.now() / 1000) + 3600),
                spendingLimit: toNano('5'),
            }
        );

        const removeResult = await aaWallet.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'RemoveSessionKey',
                publicKey: sessionKeyPubKey,
            }
        );

        expect(removeResult.transactions).toHaveTransaction({
            from: owner.address,
            to: aaWallet.address,
            success: true,
        });

        const sessionKey = await aaWallet.getSessionKey(sessionKeyPubKey);
        expect(sessionKey).toBeNull();
    });

    it('should demonstrate private key usage', async () => {
        const testPrivateKey = generateTestPrivateKey();
        const keyPair = keyPairFromSecretKey(testPrivateKey);
        const sessionKeyPubKey = BigInt('0x' + keyPair.publicKey.toString('hex'));
        
        const addKeyResult = await aaWallet.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'AddSessionKey',
                publicKey: sessionKeyPubKey,
                validUntil: BigInt(Math.floor(Date.now() / 1000) + 3600),
                spendingLimit: toNano('1'),
            }
        );

        expect(addKeyResult.transactions).toHaveTransaction({
            from: owner.address,
            to: aaWallet.address,
            success: true,
        });
    });
}); 