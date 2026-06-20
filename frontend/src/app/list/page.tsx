"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { CodeBlock } from "@/components/CodeBlock";
import { HoverButton } from "@/components/HoverButton";
import { infrAbi, infrAddress, erc8004IdentityAddress, addressUrl } from "@/lib/contracts";

export default function ListAgentPage() {
  const { address, isConnected } = useAccount();

  const { data: balance } = useReadContract({
    address: infrAddress,
    abi: infrAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return (
    <div className="section-pad">
      <div className="container max-w-3xl">
        <p className="section-label">Provider</p>
        <h1 className="display mt-3 text-[length:var(--text-3xl)]">List your agent</h1>
        <p className="prose-narrow mt-3">
          Install the package, wrap your model or agent, serve over libp2p, and sync the manifest
          to this platform so users can discover and run it.
        </p>

        <div className="card mt-8 space-y-8 p-6">
          <section>
            <h2 className="display text-lg">1. Install & import</h2>
            <CodeBlock>{`pip install -e .

from infernet import serve_agent

@serve_agent(name="my-agent", model="llama3.2", price_per_call="10")
def my_agent(task: str, max_tokens: int) -> str:
    # your model / agent logic here
    return run_model(task, max_tokens)`}</CodeBlock>
          </section>

          <section>
            <h2 className="display text-lg">2. Configure environment</h2>
            <CodeBlock>{`set INFERNET_PLATFORM_URL=http://localhost:3000
set PLATFORM_PUBLISH_KEY=your-shared-secret
set RUNNER_WALLET=0xYourWallet
set INFR_CONTRACT=0xYourINFRToken
set INFERNET_GATEWAY_URL=http://127.0.0.1:8787`}</CodeBlock>
          </section>

          <section>
            <h2 className="display text-lg">3. Serve & list on platform</h2>
            <CodeBlock>{`infernet serve --backend ollama --name my-agent --publish --manifest manifests/my-agent.json

# or publish an existing manifest
infernet publish --manifest manifests/my-agent.json`}</CodeBlock>
            <p className="mt-3 text-sm text-foreground/60">
              While running, the SDK sends heartbeats every 60s so users see online status.
            </p>
          </section>

          <section>
            <h2 className="display text-lg">4. Start gateway (for browser users)</h2>
            <CodeBlock>{`pip install -e ".[bridge]"
infernet-gateway`}</CodeBlock>
          </section>

          <div className="rounded-xl bg-surface-muted p-4 text-sm">
            <p className="font-semibold">Your wallet</p>
            <p className="mt-2 text-foreground/65">
              {isConnected
                ? `${address?.slice(0, 6)}…${address?.slice(-4)} · ${balance !== undefined ? `${formatUnits(balance, 18)} INFR` : "—"}`
                : "Connect wallet to check INFR balance."}
            </p>
            <p className="mt-3 text-foreground/55">
              ERC-8004 Identity:{" "}
              <a
                href={addressUrl(erc8004IdentityAddress)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-violet-primary hover:underline"
              >
                {erc8004IdentityAddress.slice(0, 14)}…
              </a>
            </p>
          </div>
        </div>

        <HoverButton href="/dashboard" variant="secondary" className="mt-6">
          View dashboard
        </HoverButton>
      </div>
    </div>
  );
}
