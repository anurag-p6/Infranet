# WSL deployment guide — INFR on Monad testnet

Deploy from WSL (Ubuntu). After deploy, share the handoff checklist at the bottom with the team.

## Prerequisites

```bash
# In WSL
curl -L https://foundry.paradigm.xyz | bash
foundryup

cd /mnt/c/Users/Anurag/Infranet/contracts   # adjust path if needed
forge install foundry-rs/forge-std --no-commit
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

## Configure deployer key

```bash
export DEPLOYER_PRIVATE_KEY=0xYourDeployerPrivateKey
export MONAD_RPC=https://testnet-rpc.monad.xyz
```

Deployer wallet needs testnet MON for gas: https://faucet.monad.xyz

## Deploy

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $MONAD_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  -vvvv
```

Foundry prints the deployed contract address. Save it.

## Export ABI (for frontend / tooling)

```bash
forge build
cp out/INFRToken.sol/INFRToken.json abi/INFRToken.json
```

Or extract ABI only:

```bash
jq '.abi' out/INFRToken.sol/INFRToken.json > abi/INFRToken.abi.json
```

## Fund wallets after deploy

Deployer receives the full initial supply (1,000,000 INFR).

Transfer INFR to:
- **Runner wallet** — receives inference payments
- **User/test wallet** — pays for inference in demos

Example with `cast` (Foundry):

```bash
export INFR_CONTRACT=0xYourDeployedAddress
export RUNNER_WALLET=0xRunnerAddress
export USER_WALLET=0xUserAddress

# transfer 10,000 INFR to runner (amount in wei: 10000 * 10^18)
cast send $INFR_CONTRACT \
  "transfer(address,uint256)" $RUNNER_WALLET 10000000000000000000000 \
  --rpc-url $MONAD_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

# transfer 1,000 INFR to user
cast send $INFR_CONTRACT \
  "transfer(address,uint256)" $USER_WALLET 1000000000000000000000 \
  --rpc-url $MONAD_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY
```

## Windows `.env` (after deploy)

Copy `.env.example` to `.env` and fill:

```env
MONAD_RPC=https://testnet-rpc.monad.xyz
MONAD_CHAIN_ID=10143
INFR_CONTRACT=0x<deployed_address>
INFR_DECIMALS=18
INFR_PRICE_PER_CALL=10
RUNNER_WALLET=0x<runner_address>
PAYER_PRIVATE_KEY=0x<user_private_key>
```

The Python SDK reads these automatically. No ABI needed for the SDK — it uses a minimal ERC-20 ABI built in.

---

## Handoff checklist — send back after deploy

| Item | Example | Used for |
|------|---------|----------|
| **Contract address** | `0xabc...` | `.env`, manifest `price_token` |
| **ABI JSON** | `abi/INFRToken.abi.json` | Frontend / MetaMask |
| **Chain ID** | `10143` | Wallet network config |
| **RPC URL** | `https://testnet-rpc.monad.xyz` | Frontend + SDK |
| **Explorer link** | `https://testnet.monadexplorer.com/address/0x...` | Demo / pitch |
| **Runner wallet** | `0x...` | Provider manifest |
| **Token decimals** | `18` | Amount formatting |
| **Deploy tx hash** | `0x...` | Optional proof for judges |

### Monad testnet (reference)

```
Network:  Monad Testnet
Chain ID: 10143
RPC:      https://testnet-rpc.monad.xyz
Explorer: https://testnet.monadexplorer.com
Faucet:   https://faucet.monad.xyz
```

### ERC-20 interface the frontend needs

Minimum for pay / balance UI:
- `transfer(address to, uint256 amount)`
- `balanceOf(address account)`
- `decimals()`
- `symbol()` → `"INFR"`
- `name()` → `"InferNet"`

Event for receipts:
- `Transfer(address indexed from, address indexed to, uint256 value)`

---

## Verify on explorer (optional)

```bash
forge verify-contract $INFR_CONTRACT src/INFRToken.sol:INFRToken \
  --chain-id 10143 \
  --constructor-args $(cast abi-encode "constructor(uint256)" 1000000) \
  --etherscan-api-key <monad_explorer_api_key_if_available>
```

Skip if Monad testnet verification is not set up yet — contract still works.
