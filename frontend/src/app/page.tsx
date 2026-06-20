import { AgentCard } from "@/components/AgentCard";
import { CodeBlock } from "@/components/CodeBlock";
import { HoverButton } from "@/components/HoverButton";
import { LiveStats } from "@/components/LiveStats";
import { getLiveAgents } from "@/lib/agents";
import {
  addressUrl,
  erc8004IdentityAddress,
  erc8004ReputationAddress,
  infrAddress,
} from "@/lib/contracts";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const agents = await getLiveAgents();

  return (
    <div>
      {/* Hero — asymmetric, bold type, ~60% white surface */}
      <section className="section-pad border-b border-border bg-white">
        <div className="container">
          <div className="grid items-end gap-12 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="section-label">Monad testnet · libp2p · ERC-8004</p>
              <h1 className="display mt-4 text-[length:var(--text-hero)]">
                Verified agents.
                <br />
                <span className="text-violet-primary">Fair pay.</span>
                <br />
                Open network.
              </h1>
              <p className="prose-narrow mt-6 text-lg">
                Python SDK for sharing local AI agents — OpenClaw, Ollama, custom Python —
                over libp2p. Providers expose a manifest; users call the agent remotely with
                INFR payment verified on-chain before inference runs.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <HoverButton href="/agents">Browse agents</HoverButton>
                <HoverButton href="#install" variant="secondary">
                  Read the docs
                </HoverButton>
              </div>
            </div>

            <div className="purple-band rounded-2xl p-8 lg:mb-4">
              <p className="font-mono text-xs uppercase tracking-widest opacity-80">
                Live network
              </p>
              <p className="display mt-3 text-3xl">Real-time on Monad</p>
              <p className="mt-3 text-sm opacity-90">
                Block height, manifest count, and ERC-8004 registry supply refresh every 15s.
              </p>
            </div>
          </div>

          <div className="mt-14">
            <LiveStats />
          </div>
        </div>
      </section>

      {/* Install */}
      <section id="install" className="section-pad">
        <div className="container">
          <p className="section-label">Install</p>
          <h2 className="display mt-3 text-[length:var(--text-3xl)]">Get InferNet</h2>
          <p className="prose-narrow mt-4">
            Install the Python SDK from the repo root. Requires Python 3.10+.
          </p>
          <div className="mt-6 max-w-xl">
            <CodeBlock>{`pip install -e .`}</CodeBlock>
          </div>
        </div>
      </section>

      {/* Quick start */}
      <section id="quickstart" className="section-pad bg-white">
        <div className="container">
          <p className="section-label">Quick start</p>
          <h2 className="display mt-3 text-[length:var(--text-3xl)]">Provider & user flows</h2>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <div className="card p-6">
              <h3 className="display text-xl">Provider — custom agent</h3>
              <CodeBlock>{`from infernet import serve_agent

@serve_agent(name="echo-agent", model="custom", price_per_call="1")
def my_agent(task: str, max_tokens: int) -> str:
    return f"echo: {task}"

if __name__ == "__main__":
    my_agent.serve()`}</CodeBlock>
              <p className="mt-4 text-sm text-foreground/65">
                Terminal prints a multiaddr and manifest JSON. Share either with users.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="display text-xl">User — call a shared agent</h3>
              <CodeBlock>{`from infernet import Client

client = Client.from_manifest("manifests/echo-agent.json")
result = client.infer("Summarize this contract")
print(result.output)`}</CodeBlock>
              <p className="mt-4 text-sm text-foreground/65">
                Or pass a multiaddr directly:{" "}
                <code className="font-mono text-xs">Client.from_multiaddr(...)</code>
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <ProviderNote
              title="OpenClaw"
              cmd="python examples/provider_openclaw.py"
              note="Gateway on :18789, chat completions enabled"
            />
            <ProviderNote
              title="Ollama"
              cmd="infernet serve --backend ollama --model llama3.2"
              note="Local Ollama on localhost:11434"
            />
            <ProviderNote
              title="CLI user"
              cmd='python examples/user_app.py --manifest manifests/echo-agent.json --task "hello"'
              note="Auto-pay with PAYER_PRIVATE_KEY set"
            />
          </div>
        </div>
      </section>

      {/* Payment */}
      <section id="payment" className="section-pad">
        <div className="container">
          <p className="section-label">Monad payment</p>
          <h2 className="display mt-3 text-[length:var(--text-3xl)]">INFR ERC-20 on Monad</h2>
          <p className="prose-narrow mt-4">
            The runner verifies payment on-chain before inference runs. Free agents use{" "}
            <code className="font-mono text-sm">price_per_call=0</code>.
          </p>

          <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-surface-muted p-6">
            <pre className="flow-diagram">{`User                         Monad testnet              Runner
  |  transfer INFR  --------->  tx confirmed
  |  infer + payment_tx  --------------------------------->  verify tx
  |                                                          run agent
  |  <----------------------------- output + receipt`}</pre>
          </div>

          <ol className="mt-8 space-y-4 text-sm text-foreground/70">
            <Step n={1} title="Deploy INFR token">
              <CodeBlock>{`cd contracts
forge create src/INFRToken.sol:INFRToken \\
  --rpc-url https://testnet-rpc.monad.xyz \\
  --private-key $DEPLOYER_PRIVATE_KEY \\
  --constructor-args 1000000`}</CodeBlock>
            </Step>
            <Step n={2} title="Configure environment">
              Set{" "}
              <code className="font-mono text-xs">INFR_CONTRACT</code>,{" "}
              <code className="font-mono text-xs">RUNNER_WALLET</code>,{" "}
              <code className="font-mono text-xs">INFR_PRICE_PER_CALL</code>
            </Step>
            <Step n={3} title="Fund wallets">
              Transfer INFR to runner and user wallets. User needs MON for gas (
              <a href="https://faucet.monad.xyz" className="text-violet-primary hover:underline">
                faucet
              </a>
              ).
            </Step>
          </ol>

          <p className="mt-6 font-mono text-xs text-foreground/50">
            Live INFR contract:{" "}
            <a href={addressUrl(infrAddress)} target="_blank" rel="noreferrer" className="text-violet-primary hover:underline">
              {infrAddress}
            </a>
          </p>
        </div>
      </section>

      {/* ERC-8004 */}
      <section id="erc8004" className="section-pad bg-white">
        <div className="container">
          <p className="section-label">ERC-8004</p>
          <h2 className="display mt-3 text-[length:var(--text-3xl)]">Trustless agent identity</h2>
          <p className="prose-narrow mt-4">
            Providers mint an on-chain agent NFT on the Identity Registry. Users verify the
            manifest matches chain state before calling the agent.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="table-minimal">
              <thead>
                <tr>
                  <th>Registry</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Identity</td>
                  <td>
                    <a href={addressUrl(erc8004IdentityAddress)} target="_blank" rel="noreferrer" className="font-mono text-violet-primary hover:underline">
                      {erc8004IdentityAddress}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>Reputation</td>
                  <td>
                    <a href={addressUrl(erc8004ReputationAddress)} target="_blank" rel="noreferrer" className="font-mono text-violet-primary hover:underline">
                      {erc8004ReputationAddress}
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <CodeBlock>{`infernet serve --register-erc8004 --manifest manifests/echo-agent.json

# or register existing manifest
infernet register --manifest manifests/echo-agent.json --out manifests/echo-agent.json

# verify before use
infernet verify --manifest manifests/echo-agent.json`}</CodeBlock>
            <div className="card p-6 text-sm text-foreground/70">
              <p className="font-semibold text-foreground">Agent card services</p>
              <ul className="mt-3 list-inside list-disc space-y-2">
                <li>
                  <code className="font-mono text-xs">services.infernet</code> — libp2p multiaddr
                </li>
                <li>
                  <code className="font-mono text-xs">services.infernet-manifest</code> — protocol ID
                </li>
                <li>
                  <code className="font-mono text-xs">services.wallet</code> — payment address
                </li>
                <li>
                  <code className="font-mono text-xs">supportedTrust</code> — reputation, crypto-economic
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="section-pad">
        <div className="container">
          <p className="section-label">Architecture</p>
          <h2 className="display mt-3 text-[length:var(--text-3xl)]">How it fits together</h2>
          <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-surface-muted p-6">
            <pre className="flow-diagram">{`Provider                         User
├── AgentAdapter                 ├── infernet.Client
│   ├── OpenClawAdapter          ├── loads manifest / multiaddr
│   ├── OllamaAdapter            ├── libp2p connect
│   └── CallableAdapter          └── POST /infernet/agent/1.0.0
├── libp2p runner
└── manifest JSON`}</pre>
          </div>
          <p className="mt-4 font-mono text-sm text-foreground/60">
            Protocol: /infernet/agent/1.0.0 · Manifest: /infernet/manifest/1.0.0
          </p>
        </div>
      </section>

      {/* Adapters */}
      <section id="adapters" className="section-pad bg-white">
        <div className="container">
          <p className="section-label">Adapters</p>
          <h2 className="display mt-3 text-[length:var(--text-3xl)]">Agent backends</h2>
          <div className="mt-8 overflow-x-auto">
            <table className="table-minimal">
              <thead>
                <tr>
                  <th>Adapter</th>
                  <th>Backend</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>CallableAdapter</td>
                  <td>Any Python function</td>
                </tr>
                <tr>
                  <td>OllamaAdapter</td>
                  <td>Local Ollama (localhost:11434)</td>
                </tr>
                <tr>
                  <td>OpenClawAdapter</td>
                  <td>OpenClaw Gateway (localhost:18789)</td>
                </tr>
                <tr>
                  <td>HttpAdapter</td>
                  <td>Any OpenAI-compatible API</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Sharing flow */}
      <section id="sharing" className="section-pad">
        <div className="container">
          <p className="section-label">Sharing flow</p>
          <h2 className="display mt-3 text-[length:var(--text-3xl)]">Five steps</h2>
          <ol className="mt-8 space-y-3 text-foreground/70">
            {[
              "Provider runs infernet serve or my_agent.serve()",
              "Terminal prints multiaddr + manifest",
              "Provider shares multiaddr or manifests/<agent>.json",
              "User calls Client.from_manifest(...) or Client.from_multiaddr(...)",
              "User runs client.infer(task)",
            ].map((step, i) => (
              <li key={step} className="flex gap-4 border-b border-border pb-3">
                <span className="display text-violet-primary">{String(i + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm font-medium text-foreground/80">
            You share access, not source code.
          </p>
        </div>
      </section>

      {/* Live agents */}
      <section id="agents" className="section-pad bg-white">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-label">Live directory</p>
              <h2 className="display mt-3 text-[length:var(--text-3xl)]">
                Agents from manifests/
              </h2>
              <p className="mt-2 text-sm text-foreground/60">
                Loaded from disk · ERC-8004 status checked on-chain
              </p>
            </div>
            <HoverButton href="/agents" variant="secondary" className="text-sm">
              Full marketplace
            </HoverButton>
          </div>

          {agents.length === 0 ? (
            <div className="card mt-8 p-8 text-center text-foreground/60">
              <p>No manifests found. Add JSON files to manifests/ and refresh.</p>
              <CodeBlock>{`infernet serve --manifest manifests/your-agent.json`}</CodeBlock>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Project layout */}
      <section id="layout" className="section-pad purple-band">
        <div className="container">
          <p className="font-mono text-xs uppercase tracking-widest opacity-75">Project layout</p>
          <h2 className="display mt-3 text-[length:var(--text-2xl)]">Repository structure</h2>
          <pre className="mt-6 overflow-x-auto font-mono text-sm leading-relaxed opacity-95">{`infernet/
├── infernet/           # Python package
│   ├── adapters/       # OpenClaw, Ollama, HTTP, callable
│   ├── client.py       # User SDK
│   ├── runner.py       # libp2p provider
│   ├── manifest.py     # Capability manifest
│   ├── payment.py      # Monad INFR pay + verify
│   ├── erc8004.py      # ERC-8004 identity register + verify
│   └── p2p.py          # libp2p stream helpers
├── contracts/          # INFR ERC-20 (Foundry)
├── frontend/           # This site
├── examples/
└── manifests/          # Exported agent manifests`}</pre>
        </div>
      </section>
    </div>
  );
}

function ProviderNote({
  title,
  cmd,
  note,
}: {
  title: string;
  cmd: string;
  note: string;
}) {
  return (
    <div className="card p-5">
      <h4 className="display text-lg">{title}</h4>
      <p className="mt-2 font-mono text-xs text-violet-primary">{cmd}</p>
      <p className="mt-2 text-xs text-foreground/55">{note}</p>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="display flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-primary text-sm text-white">
        {n}
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <div className="mt-2">{children}</div>
      </div>
    </li>
  );
}
