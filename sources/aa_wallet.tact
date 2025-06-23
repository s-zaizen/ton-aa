import "@stdlib/ownable";
import "@stdlib/deploy";

struct SessionKey {
    publicKey: Int as uint256;
    validUntil: Int as uint32;
    spendingLimit: Int as coins;
    spent: Int as coins;
}

message(0x1) ExecuteTransaction {
    seqno: Int as uint32;
    mode: Int as uint8;
    to: Address;
    value: Int as coins;
    body: Cell?;
    sessionKeySignature: Slice?;
}

message(0x2) AddSessionKey {
    publicKey: Int as uint256;
    validUntil: Int as uint32;
    spendingLimit: Int as coins;
}

message(0x3) RemoveSessionKey {
    publicKey: Int as uint256;
}

message(0x4) SponsorGas {
    amount: Int as coins;
}

fun executeTransaction(mode: Int, to: Address, value: Int, body: Cell?) {
    send(SendParameters{
        to: to,
        value: value,
        mode: mode,
        bounce: true,
        body: body
    });
}

contract AAWallet with Deployable, Ownable {
    owner: Address;
    seqno: Int as uint32;
    sessionKeys: map<Int, SessionKey>;
    gasSponsors: map<Address, Int>;
    
    init(owner: Address) {
        self.owner = owner;
        self.seqno = 0;
    }
    
    receive() {
    }
    
    receive(msg: ExecuteTransaction) {
        require(msg.seqno == self.seqno, "Invalid sequence number");
        self.seqno += 1;
        
        let ctx: Context = context();
        
        if (ctx.sender == self.owner) {
            executeTransaction(msg.mode, msg.to, msg.value, msg.body);
        } else if (msg.sessionKeySignature != null) {
            self.validateAndExecuteWithSessionKey(msg, ctx);
        } else {
            let sponsorBalance: Int? = self.gasSponsors.get(ctx.sender);
            if (sponsorBalance != null) {
                let gasUsed: Int = context().value;
                require(sponsorBalance!! >= gasUsed, "Insufficient sponsor balance");
                self.gasSponsors.set(ctx.sender, sponsorBalance!! - gasUsed);
                
                executeTransaction(msg.mode, msg.to, msg.value, msg.body);
            } else {
                throw(401);
            }
        }
    }
    
    receive(msg: AddSessionKey) {
        self.requireOwner();
        
        let sessionKey: SessionKey = SessionKey{
            publicKey: msg.publicKey,
            validUntil: msg.validUntil,
            spendingLimit: msg.spendingLimit,
            spent: 0
        };
        
        self.sessionKeys.set(msg.publicKey, sessionKey);
        
        self.notify("SessionKeyAdded".asComment());
    }
    
    receive(msg: RemoveSessionKey) {
        self.requireOwner();
        
        self.sessionKeys.set(msg.publicKey, null);
        
        self.notify("SessionKeyRemoved".asComment());
    }
    
    receive(msg: SponsorGas) {
        let ctx: Context = context();
        let currentBalance: Int? = self.gasSponsors.get(ctx.sender);
        let balance: Int = 0;
        if (currentBalance != null) {
            balance = currentBalance!!;
        }
        
        self.gasSponsors.set(ctx.sender, balance + msg.amount);
        
        self.notify("GasSponsored".asComment());
    }

    inline fun validateAndExecuteWithSessionKey(msg: ExecuteTransaction, ctx: Context) {
        require(msg.sessionKeySignature != null, "Session key signature required");
        
        let signature: Slice = msg.sessionKeySignature!!;
        require(signature.bits() >= 768, "Invalid signature format");
        let sessionKeyPubKey: Int = signature.loadUint(256);
        let r: Int = signature.loadUint(256);
        let s: Int = signature.loadUint(256);
        
        let sessionKey: SessionKey? = self.sessionKeys.get(sessionKeyPubKey);
        require(sessionKey != null, "Session key not found");
        
        require(now() <= sessionKey!!.validUntil, "Session key expired");
        require(sessionKey!!.spent + msg.value <= sessionKey!!.spendingLimit, "Spending limit exceeded");
        
        let bodyCell: Cell = msg.body != null ? msg.body!! : emptyCell();
        let msgCell: Cell = beginCell()
            .storeUint(msg.seqno, 32)
            .storeUint(msg.mode, 8)
            .storeAddress(msg.to)
            .storeCoins(msg.value)
            .storeRef(bodyCell)
            .endCell();
        
        let msgHash: Int = msgCell.hash();
        
        let isValid: Bool = checkSignature(msgHash, beginCell().storeUint(r, 256).storeUint(s, 256).endCell().beginParse(), sessionKeyPubKey);
        require(isValid, "Invalid session key signature");
        
        self.sessionKeys.set(sessionKeyPubKey, SessionKey{
            publicKey: sessionKey!!.publicKey,
            validUntil: sessionKey!!.validUntil,
            spendingLimit: sessionKey!!.spendingLimit,
            spent: sessionKey!!.spent + msg.value
        });
        
        executeTransaction(msg.mode, msg.to, msg.value, msg.body);
    }
    
    get fun seqno(): Int {
        return self.seqno;
    }
    
    get fun sessionKey(publicKey: Int): SessionKey? {
        return self.sessionKeys.get(publicKey);
    }
    
    get fun sponsorBalance(sponsor: Address): Int {
        let balance: Int? = self.gasSponsors.get(sponsor);
        if (balance != null) {
            return balance!!;
        }
        return 0;
    }
} 