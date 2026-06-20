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

### User — call a shared agent

```bash
python examples/user_app.py \
  --multiaddr "/ip4/127.0.0.1/tcp/8000/p2p/12D3Koo..." \
  --task "Summarize this contract"
```

Or from Python:

```python
from infernet import Client

client = Client.from_multiaddr("/ip4/127.0.0.1/tcp/8000/p2p/12D3Koo...")
result = client.infer("Explain Monad in one sentence")
print(result.output)
```

Load from saved manifest:

```python
client = Client.from_manifest("manifests/echo-agent.json")
result = client.infer("hello")
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

### 4. User — auto-pay with private key

```bash
set PAYER_PRIVATE_KEY=0xYourUserPrivateKey
set INFR_CONTRACT=0xYourINFRContractAddress
python examples/user_app.py --manifest manifests/echo-agent.json --task "hello"
```

The client sends INFR directly on Monad, then calls the agent with `payment_tx`.

Or pass an existing tx manually:

```bash
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

## Architecture

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
│   └── p2p.py          # libp2p stream helpers
├── contracts/          # INFR ERC-20 (Foundry)
├── examples/
│   ├── provider_openclaw.py
│   ├── provider_ollama.py
│   ├── provider_custom.py
│   └── user_app.py
└── manifests/          # Exported agent manifests
```

---

## Tagline

> *"Share a URL, not your code. Verified agent, verified payment."*
