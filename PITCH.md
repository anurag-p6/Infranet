# P2P Agent Sharing

### InferNet — *Verified agents. Fair pay. Open network.*

A peer-to-peer marketplace where anyone can **share a local AI agent and get paid per call** — settled on-chain on Monad, with cryptographic identity and payment verification baked into the protocol.

> This is the step-wise pitch. Every claim is tagged with a source in **§ Data & sources**.

---

## Step 1 — The hook (10 seconds)

> "AI inference is a **$117–137 billion market in 2026**, growing **13–18% a year** [1][2]. Almost all of it runs through a handful of centralized clouds. Meanwhile millions of capable agents and GPUs sit idle on developers' own machines. **InferNet turns idle agents into income** — share one, get paid per call, no servers, no sign-ups."

---

## Step 2 — The problem (data-driven)

| Pain | Evidence |
|------|----------|
| Inference is centralized & capex-heavy | Hyperscalers (AWS, Azure, Google, Oracle) committed **$320B+** to AI data centers in FY2025 alone [3] |
| Inference demand is the *real* workload | Inference (always-on) is projected to grow **~4.2× faster** than training compute as enterprise AI adoption rises [3] |
| Providers can't monetize idle agents | No turnkey way to expose a local model and bill per call without building cloud infra, auth, and billing |
| Consumers can't trust a random endpoint | "Is this the agent it claims to be? Did my payment actually land?" — no standard answer today |

**One line:** the demand is exploding and centralized; the supply (idle agents) is everywhere and unmonetized. There's no neutral marketplace connecting them.

---

## Step 3 — The market (why now)

- AI inference market: **$117.8B (2026) → $312.6B (2034), 12.98% CAGR** [1]; an independent estimate puts it at **$136.7B (2026) → $365.8B (2032), 17.6% CAGR** [2].
- The enabling rail just shipped: **Monad mainnet went live Nov 24, 2025** [4] with **near-zero fees** — making on-chain *micropayments* per inference call economically viable for the first time.
- Timing: large inference TAM + a fast, cheap settlement layer = the moment a pay-per-call agent network becomes possible.

---

## Step 4 — The solution

A **two-sided package** plus a discovery platform:

| Side | What they do | The one command |
|------|--------------|-----------------|
| **Provider** (host) | Wrap any agent, run it, auto-list it | `my_agent.serve()` |
| **Consumer** (user) | Copy the agent's **ID**, call it, auto-pay | `Client.from_agent("id")` |

The entire consumer onboarding is **copying one parameter** — the agent ID — into their project. The SDK resolves the live endpoint, price, and wallet automatically.

---

## Step 5 — How it works (the trust loop)

```
   PROVIDER MACHINE              PLATFORM (Next.js)            CONSUMER PROJECT
 ┌──────────────────┐      ┌──────────────────────┐      ┌────────────────────┐
 │ @serve_agent fn  │ POST │  /agents (board)     │ copy │ Client.from_agent( │
 │  → AgentAdapter  │ ───► │  /agents/<id>        │ ─id─►│   "echo-agent")    │
 │ libp2p runner    │ man. │   + copy snippet     │      │   .infer("...")    │
 └────────┬─────────┘ +HB  └──────────┬───────────┘      └─────────┬──────────┘
          │   libp2p stream (/infernet/agent/1.0.0)                 │
          └───────────────────────◄───────────────────────────────┘
                          ┌─────────▼──────────┐
                          │   MONAD            │
                          │ INFR ERC-20 (pay)  │
                          │ ERC-8004 (identity)│
                          └────────────────────┘
```

**The defensible part — payment is enforced by the protocol:**
1. Consumer signs an **INFR transfer** with their own key → gets a `payment_tx`.
2. Consumer calls the agent, passing `payment_tx`.
3. The runner **verifies the on-chain `Transfer` event** (correct recipient, correct amount) *before* running inference.
4. No verified payment → no inference. Identity is checked against an **ERC-8004 on-chain NFT**.

---

## Step 6 — Why Monad (data-driven)

Per-call micropayments only work on a chain that's fast and nearly free. Monad delivers:

| Metric | Monad | Ethereum L1 |
|--------|-------|-------------|
| Throughput | **~10,000 TPS** [4][5] | ~10 TPS [4] |
| Block time | **400 ms** [4] | 12 s [4] |
| Finality | **800 ms** [4] | 12–18 min [4] |
| Avg gas fee | **$0.004–$0.007** [5][6] | dollars |

Proven at scale on testnet: **2.44B+ transactions processed (98% success), 34M+ contracts, 240+ ecosystem projects** [5][6]. Backed by **$244M** led by Paradigm [4].

---

## Step 7 — Unit economics (the micropayment case)

The whole model hinges on settlement cost being a rounding error vs. the value of a call:

- Settlement cost per call on Monad: **~$0.005** [5][6].
- That's **< 1%** overhead on a typical inference call worth cents to dollars.
- On Ethereum L1 at dollar-level gas, on-chain pay-per-call would cost **more than the inference itself** — economically impossible.

> **Takeaway:** Monad's near-zero fee is not a nice-to-have — it's the reason a pay-per-call agent network is viable at all.

*(Illustrative model — validate live with the `payment_tx` on a Monad explorer during the demo.)*

---

## Step 8 — Live demo (90 seconds, what judges see)

**Before:** open `http://localhost:3000/agents` → empty board.

**Provider lists an agent (Terminal B):**
```bash
set INFERNET_PLATFORM_URL=http://localhost:3000
set PUBLISH_TO_PLATFORM=1
set INFR_CONTRACT=0xD1758e1205f79C4F2dAc8f6b7D32A2E517835851
python examples/provider_custom.py
```
Terminal prints a clickable link:
```
────────────────────────────────────────────
Your agent is published. View & share it here:
  http://localhost:3000/agents/echo-agent
────────────────────────────────────────────
```

**Discover:** refresh `/agents` → `echo-agent` shows **online**. Open it → detail page with price, wallet, ERC-8004 status, and a **"copy the agent id"** snippet.

**Consumer calls it (Terminal C):**
```bash
set INFERNET_PLATFORM_URL=http://localhost:3000
set PAYER_PRIVATE_KEY=0xYourConsumerKey
python examples/consumer.py --agent echo-agent --task "Explain Monad in one sentence"
```
```json
{ "output": "...", "tokens_used": 8, "payment_tx": "0xabc..." }
```

**The money line:** "That `payment_tx` is a real INFR transfer on Monad — the runner verified it on-chain *before* responding. No payment, no inference."

---

## Step 9 — What's built (traction)

| Capability | Status |
|------------|--------|
| P2P provider + consumer SDK over libp2p | ✅ Working |
| 4 agent backends (Callable, Ollama, OpenClaw, HTTP) | ✅ Working |
| Platform: listing, discovery, copy-snippet, online heartbeat | ✅ Working |
| On-chain INFR payment (consumer-signed) + runner verification | ✅ Working |
| ERC-8004 on-chain identity register + verify | ✅ Working |
| Next.js marketplace UI (Monad theme) | ✅ Working |
| On-chain reputation / staking + slashing | 🔜 Roadmap |

**Two protocols shipped:** `/infernet/agent/1.0.0` (inference), `/infernet/manifest/1.0.0` (discovery).

---

## Step 10 — Business model

- **Protocol fee:** small % skim on each INFR settlement (e.g., 1–2%).
- **Staking economics:** providers stake INFR to list; bad responses get slashed → quality signal + token sink.
- **Premium discovery:** featured listings, verified-org badges.
- Scales with **call volume**, not headcount — every call is a metered, on-chain event.

---

## Step 11 — Roadmap

1. **Reputation + staking contract** — stake to list, slash on bad responses (scoped).
2. **Streaming responses** over the libp2p stream.
3. **Multi-chain settlement** — note: MetaMask's agent-wallet CLI does not support Monad testnet yet, so today we settle via direct on-chain transfers signed by the consumer.
4. **SDK distribution** — `pip install infernet`, hosted public platform.

---

## Step 12 — The ask / close

> "InferNet makes every idle agent a revenue stream and every call a verifiable, paid transaction — on the only EVM chain fast and cheap enough to make per-call payments real. We have the full loop working today: **host → list → discover → pay → verify → infer.** We're looking for [compute partners / testnet users / funding] to grow the supply side."

**Remember the three words:** *Verified. Fair. Open.*

---

## Data & sources

1. Fortune Business Insights — *AI Inference Market*: $117.8B (2026) → $312.64B (2034), 12.98% CAGR. https://www.fortunebusinessinsights.com/ai-inference-market-113705
2. Research and Markets — *AI Inference Solutions Market*: $136.7B (2026) → $365.83B (2032), 17.6% CAGR. https://www.researchandmarkets.com/reports/6124134/
3. Evolvance Market Research — *AI Infrastructure Market*: $320B+ hyperscaler capex FY2025; inference growing ~4.2× training compute. https://evolvancemarketresearch.com/reports/ai-infrastructure-market/
4. Monad docs / crypto.news — 10,000 TPS, 400ms blocks, 800ms finality; mainnet live Nov 24, 2025; $244M raised (Paradigm). https://docs.monad.xyz/introduction/monad-for-developers
5. Token Metrics Research — Monad deep dive: 2.44B+ testnet txns, 240+ projects, $0.004–$0.007 avg gas. https://research.tokenmetrics.com/p/deep-dive-monad-10-000-tps-evm-powerhouse
6. CoinGecko — *What Is Monad*: 2.44B+ txns (98% success), 34M+ contracts, $0.004–$0.007 fees. https://www.coingecko.com/learn/what-is-monad-crypto

*Market figures are third-party estimates and vary by report scope. Unit-economics in Step 7 are an illustrative model — verify live during the demo.*
