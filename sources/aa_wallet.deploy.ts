import * as fs from "fs";
import * as path from "path";
import { Address, contractAddress, toNano, fromNano, Cell, beginCell } from "@ton/core";
import { AAWallet } from "./output/aa_wallet_AAWallet";
import { prepareTactDeployment } from "@tact-lang/deployer";
import { TonClient, WalletContractV4 } from "@ton/ton";
import { keyPairFromSecretKey } from "@ton/crypto";

(async (): Promise<void> => {
    const testnet = true;
    const endpoint = "https://testnet.toncenter.com/api/v2/jsonRPC";
    
    const client = new TonClient({
        endpoint: endpoint,
        apiKey: undefined
    });
    
    try {
        await client.getMasterchainInfo();
    } catch (apiError) {
        console.error("API connection failed:", apiError instanceof Error ? apiError.message : String(apiError));
        process.exit(1);
    }
    
    const packageName = "aa_wallet_AAWallet.pkg";
    const privateKeyHex = "...";
    const OWNER_ADDRESS = "...";
    
    try {
        const privateKeyBuffer = Buffer.from(privateKeyHex, 'hex');
        const keyPair = keyPairFromSecretKey(privateKeyBuffer);
        const wallet = WalletContractV4.create({
            publicKey: keyPair.publicKey,
            workchain: 0
        });
        
        const walletAddress = wallet.address.toString({ testOnly: testnet });
        console.log(`Wallet: ${walletAddress}`);
        
        const owner = Address.parse(OWNER_ADDRESS);
        const init = await AAWallet.init(owner);
        const contractAddr = contractAddress(0, init);
        
        console.log(`Contract: ${contractAddr.toString({ testOnly: testnet })}`);
        
        const data = init.data.toBoc();
        const pkg = fs.readFileSync(path.resolve(__dirname, "output", packageName));
        const prepare = await prepareTactDeployment({ pkg, data, testnet });

        const deploymentLink = typeof prepare.link === 'function' ? prepare.link("") : prepare.link;
        const cleanLink = typeof deploymentLink === 'string' ? deploymentLink.replace(/<[^>]*>/g, '') : deploymentLink;
        console.log("Deployment Link: ", cleanLink);
        console.log("Contract Address: ", contractAddr.toString());
        
    } catch (error) {
        console.error("Deployment failed:", error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
})(); 