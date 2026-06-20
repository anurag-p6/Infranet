import Link from "next/link";
import { notFound } from "next/navigation";
import { VerificationBadge } from "@/components/VerificationBadge";
import { EndpointStatus } from "@/components/EndpointStatus";
import { AgentStatusBadge } from "@/components/AgentStatusBadge";
import { StakeBadge } from "@/components/StakeBadge";
import { InferencePanel } from "@/components/InferencePanel";
import { CopyAgentSnippet } from "@/components/CopyAgentSnippet";
import { getAgentById } from "@/lib/agents";
import { addressUrl, nftUrl, erc8004IdentityAddress } from "@/lib/contracts";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgentById(id);
  if (!agent) notFound();

  const canRun = agent.hasEndpoint && (agent.isPaid ? Boolean(agent.wallet) : true);

  return (
    <div className="section-pad">
      <div className="container max-w-4xl">
        <Link href="/agents" className="text-sm font-medium text-violet-primary hover:underline">
          ← Back to agents
        </Link>

        <div className="card mt-6 space-y-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="display text-[length:var(--text-3xl)]">{agent.name}</h1>
              <p className="mt-2 font-mono text-sm text-foreground/60">
                {agent.model} · {agent.backend} · {agent.protocol}
              </p>
            </div>
            <EndpointStatus hasEndpoint={agent.hasEndpoint} />
          </div>

          <p className="text-foreground/80">{agent.description}</p>

          <div className="flex flex-wrap gap-2">
            <VerificationBadge
              registered={agent.isRegistered}
              verified={agent.onChainVerified}
              agentId={agent.erc8004AgentId}
            />
            <StakeBadge staked={agent.staked} amount={agent.stakeOnChain} />
            <AgentStatusBadge status={agent.status} />
          </div>

          <div className="rounded-xl bg-surface-muted p-4 text-sm">
            <p className="font-semibold">Manifest fields</p>
            <dl className="mt-3 space-y-2 font-mono text-xs text-foreground/70">
              <div className="flex flex-wrap gap-2">
                <dt className="text-foreground/45">price</dt>
                <dd>{agent.isPaid ? `${agent.pricePerCall} INFR` : "Free"}</dd>
              </div>
              <div className="flex flex-wrap gap-2">
                <dt className="text-foreground/45">stake</dt>
                <dd>
                  {agent.staked ? (
                    <>
                      {agent.stakeOnChain} MON bonded
                      {agent.stakerOnChain && (
                        <>
                          {" "}
                          <a
                            href={addressUrl(agent.stakerOnChain)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-violet-primary hover:underline"
                          >
                            (staker)
                          </a>
                        </>
                      )}
                    </>
                  ) : (
                    "No bond"
                  )}
                </dd>
              </div>
              {agent.wallet && (
                <div className="flex flex-wrap gap-2">
                  <dt className="text-foreground/45">wallet</dt>
                  <dd>
                    <a href={addressUrl(agent.wallet)} target="_blank" rel="noreferrer" className="text-violet-primary hover:underline">
                      {agent.wallet}
                    </a>
                  </dd>
                </div>
              )}
              {agent.multiaddr && (
                <div className="flex flex-wrap gap-2">
                  <dt className="text-foreground/45">multiaddr</dt>
                  <dd className="break-all">{agent.multiaddr}</dd>
                </div>
              )}
              {agent.erc8004AgentId && (
                <div className="flex flex-wrap gap-2">
                  <dt className="text-foreground/45">erc8004</dt>
                  <dd>
                    <a
                      href={nftUrl(erc8004IdentityAddress, agent.erc8004AgentId)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-primary hover:underline"
                    >
                      Agent #{agent.erc8004AgentId}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="mt-6">
          <CopyAgentSnippet
            agentId={agent.id}
            isPaid={agent.isPaid}
            pricePerCall={agent.pricePerCall}
            isVerified={agent.onChainVerified}
          />
        </div>

        {canRun ? (
          <div className="mt-6">
            <InferencePanel agent={agent} />
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-foreground/70">
            This agent needs a libp2p multiaddr before it can be called from the platform.
            Providers: run{" "}
            <code className="font-mono text-xs">infernet serve --publish</code> to sync.
          </p>
        )}
      </div>
    </div>
  );
}
