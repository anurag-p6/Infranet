# InferNet

> **Verified agents. Fair pay. Open network.**

Python SDK for sharing **local AI agents** (OpenClaw, Ollama, custom Python) over **libp2p**.

Providers expose a running agent and share a **manifest** (JSON with peer multiaddr, model, price). Users install `infernet`, load the manifest, and call the agent remotely.

---

## Install

```bash
pip install -e .
```

---

## Quick start

### Provider — share a custom agent

```python
from infernet import serve_agent

@serve_agent(name="echo-agent", model="custom", price_per_call="1")
def my_agent(task: str, max_tokens: int) -> str:
    return f"echo: {task}"

if __name__ == "__main__":
    my_agent.serve()
```

Terminal prints a **multiaddr** and manifest JSON. Share either with users.

### Provider — share OpenClaw

Prerequisites:
1. OpenClaw gateway running: `openclaw gateway start`
2. Enable chat completions in config: `gateway.http.endpoints.chatCompletions.enabled = true`
3. Optional: `set OPENCLAW_TOKEN=your-token`

```bash
python examples/provider_openclaw.py
```

### Provider — share Ollama

```bash
python examples/provider_ollama.py
# or
infernet serve --backend ollama --model llama3.2 --name ollama-general
```

### User — call a listed agent (copy the id)

Browse the platform, copy an agent's **id**, and drop it into your project — the
SDK resolves the live endpoint, price, and wallet for you:

```python
from infernet import Client

# id copied straight from the platform listing
client = Client.from_agent("echo-agent", platform_url="http://localhost:3000")
result = client.infer("Explain Monad in one sentence")
print(result.output)
```

Or from the CLI:

```bash
infernet call echo-agent --task "Explain Monad in one sentence" \
  --platform-url http://localhost:3000
# or set INFERNET_PLATFORM_URL once and omit --platform-url
python examples/consumer.py --agent echo-agent --task "hello"
```

No platform? Connect directly with a multiaddr or saved manifest:

```python
client = Client.from_multiaddr("/ip4/127.0.0.1/tcp/8000/p2p/12D3Koo...")
client = Client.from_manifest("manifests/echo-agent.json")
```

---

## Monad payment (direct on-chain)

InferNet uses **INFR ERC-20 on Monad testnet**. The runner verifies payment on-chain before inference runs.

### 1. Deploy INFR token

```bash
cd contracts
forge create src/INFRToken.sol:INFRToken \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args 1000000
```

Copy the deployed address into your environment:

```bash
set INFR_CONTRACT=0xYourINFRContractAddress
set RUNNER_WALLET=0xYourRunnerWallet
set INFR_PRICE_PER_CALL=10
```

### 2. Fund wallets

- Mint gives INFR to deployer — transfer INFR to user wallet
- User wallet needs a little MON for gas on Monad testnet ([faucet](https://faucet.monad.xyz))

### 3. Provider — paid agent

```bash
set RUNNER_WALLET=0xYourRunnerWallet
set INFR_CONTRACT=0xYourINFRContractAddress
set INFR_PRICE_PER_CALL=10
python examples/provider_custom.py
```

Manifest now includes `price_per_call`, `price_token`, and `wallet`.

### 4. User — auto-pay with the consumer's private key

Payment is a **normal on-chain INFR transfer** signed by the consumer's own
key. Provide it via `PAYER_PRIVATE_KEY` (keeps the key out of shell history):

```bash
set PAYER_PRIVATE_KEY=0xYourConsumerPrivateKey
set INFR_CONTRACT=0xYourINFRContractAddress
python examples/consumer.py --agent echo-agent --task "hello"
```

From Python you can also pass the key explicitly:

```python
import os
from infernet import Client

client = Client.from_agent(
    "echo-agent",
    private_key=os.environ["PAYER_PRIVATE_KEY"],
)
print(client.infer("hello").output)
```

The client signs and sends the INFR transfer on-chain, waits for the receipt,
then calls the agent with the resulting `payment_tx`. The runner verifies that
transaction before running inference.

Or pass an existing tx manually (no key needed):

```bash
python examples/consumer.py --agent echo-agent --task "hello" --no-auto-pay
# then supply the tx via the user_app flow:
python examples/user_app.py --manifest manifests/echo-agent.json --task "hello" --payment-tx 0xabc... --no-auto-pay
```

### Payment flow

```
User                         Monad testnet              Runner
  |  transfer INFR  --------->  tx confirmed
  |  infer + payment_tx  --------------------------------->  verify tx
  |                                                          run agent
  |  <----------------------------- output + receipt
```

**Free agents:** set `price_per_call=0` — no payment required.

---

## ERC-8004 agent verification (Monad)

InferNet integrates with the [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) Identity Registry on Monad testnet. Providers mint an on-chain agent NFT; users verify the manifest matches chain state before calling the agent.

Pre-deployed registries on Monad testnet:

| Registry | Address |
|----------|---------|
| Identity | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Reputation | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |

### 1. Provider — register on serve

```bash
set AGENT_OWNER_PRIVATE_KEY=0xYourProviderKey
set RUNNER_WALLET=0xYourRunnerWallet
infernet serve --backend ollama --name echo-agent --register-erc8004 --manifest manifests/echo-agent.json
```

Or auto-register via env:

```bash
set REGISTER_ERC8004=1
python examples/provider_custom.py
```

The manifest gains `erc8004_agent_id`, `erc8004_registry`, and `erc8004_tx`.

### 2. Provider — register an existing manifest

```bash
infernet register --manifest manifests/echo-agent.json --out manifests/echo-agent.json
```

Preview the agent card without sending a tx:

```bash
infernet register --manifest manifests/echo-agent.json --dry-run
```

### 3. User — verified inference

When a manifest includes `erc8004_agent_id`, the client verifies on-chain identity automatically:

```python
from infernet import Client

client = Client.from_manifest("manifests/echo-agent.json")
result = client.infer("hello")  # verifies ERC-8004 before connecting
```

Manual verification:

```bash
infernet verify --manifest manifests/echo-agent.json
```

### Agent card format

InferNet publishes an ERC-8004 registration-v1 JSON (stored on-chain as a base64 data URI) with:

- `services.infernet` — libp2p multiaddr
- `services.infernet-manifest` — protocol ID (`/infernet/agent/1.0.0`)
- `services.wallet` — payment address (when paid)
- `supportedTrust` — `reputation`, `crypto-economic`

---

## Platform sync (list → discover → use)

Providers list agents on the platform; users browse, filter, and run them in the browser.

### Provider flow

```bash
pip install -e .

set INFERNET_PLATFORM_URL=http://localhost:3000
set PLATFORM_PUBLISH_KEY=dev-publish-key-change-me
set PUBLISH_TO_PLATFORM=1

# wrap your agent and list on platform
infernet serve --backend ollama --name my-agent --publish --manifest manifests/my-agent.json

# or publish an existing manifest
infernet publish --manifest manifests/my-agent.json
```

While serving, the SDK sends heartbeats every 60s (online status on the marketplace).

### User flow

1. Open `/agents` — filter by backend, free/paid, ERC-8004 verified, online
2. Open an agent → **copy its id** (or the ready-made Python/CLI snippet)
3. Drop it into your project: `Client.from_agent("<id>")`
4. Or run it in the browser: paid agents pay INFR then call the libp2p runner;
   free agents call the runner directly

The id is the only parameter you need to copy — the SDK fetches the manifest
from `GET /api/manifests/<id>` and connects.

### Gateway (required for browser inference)

```bash
pip install -e ".[bridge]"
infernet-gateway
# listens on http://127.0.0.1:8787
```

Set `INFERNET_GATEWAY_URL` in frontend `.env.local`.

### API

| Endpoint | Role |
|----------|------|
| `POST /api/manifests` | Provider publishes manifest (Bearer `PLATFORM_PUBLISH_KEY`) |
| `POST /api/manifests/heartbeat` | Provider heartbeat while serving |
| `GET /api/manifests/<id>` | Resolve one manifest by id (used by `Client.from_agent`) |
| `GET /api/agents?q=&backend=&paid=1&verified=1&online=1` | User discovery |
| `POST /api/infer` | Verify payment → proxy to gateway |

---

```
Provider                         User
├── AgentAdapter                 ├── infernet.Client
│   ├── OpenClawAdapter          ├── loads manifest / multiaddr
│   ├── OllamaAdapter            ├── libp2p connect
│   └── CallableAdapter          └── POST /infernet/agent/1.0.0
├── libp2p runner
└── manifest JSON
```

**Protocol:** `/infernet/agent/1.0.0` (length-prefixed JSON over libp2p stream)

**Manifest protocol:** `/infernet/manifest/1.0.0`

---

## Agent adapters

| Adapter | Backend |
|---------|---------|
| `CallableAdapter` | Any Python function |
| `OllamaAdapter` | Local Ollama (`localhost:11434`) |
| `OpenClawAdapter` | OpenClaw Gateway (`localhost:18789/v1/chat/completions`) |
| `HttpAdapter` | Any OpenAI-compatible API |

---

## Sharing flow

1. Provider runs `infernet serve` or `my_agent.serve()`
2. Terminal prints multiaddr + manifest
3. Provider shares multiaddr or `manifests/<agent>.json` with user
4. User calls `Client.from_manifest(...)` or `Client.from_multiaddr(...)`
5. User runs `client.infer(task)`

You share **access**, not source code.

---

## Project layout

```
infernet/
├── infernet/           # Python package
│   ├── adapters/       # OpenClaw, Ollama, HTTP, callable
│   ├── client.py       # User SDK
│   ├── runner.py       # libp2p provider
│   ├── manifest.py     # Capability manifest
│   ├── payment.py      # Monad INFR pay + verify
│   ├── erc8004.py      # ERC-8004 identity register + verify
│   └── p2p.py          # libp2p stream helpers
├── contracts/          # INFR ERC-20 (Foundry)
├── examples/
│   ├── provider_openclaw.py   # host side
│   ├── provider_ollama.py     # host side
│   ├── provider_custom.py     # host side
│   ├── consumer.py            # use side (copy the agent id)
│   └── user_app.py            # use side (manifest / multiaddr)
└── manifests/          # Exported agent manifests
```

---

## Tagline

> *"Share a URL, not your code. Verified agent, verified payment."*
