import type { ListedAgent } from "@/lib/agents";
import { VerificationBadge } from "@/components/VerificationBadge";
import { EndpointStatus } from "@/components/EndpointStatus";
import { AgentStatusBadge } from "@/components/AgentStatusBadge";
import { StakeBadge } from "@/components/StakeBadge";
import { HoverButton } from "@/components/HoverButton";

export function AgentCard({ agent }: { agent: ListedAgent }) {
  return (
    <article className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="display text-xl">{agent.name}</h3>
          <p className="mt-1 font-mono text-xs text-foreground/55">
            {agent.model} · {agent.backend}
          </p>
        </div>
        <AgentStatusBadge status={agent.status} />
      </div>

      <p className="line-clamp-2 text-sm text-foreground/70">{agent.description}</p>

      <div className="flex flex-wrap gap-2">
        <VerificationBadge
          registered={agent.isRegistered}
          verified={agent.onChainVerified}
          agentId={agent.erc8004AgentId}
        />
        <StakeBadge staked={agent.staked} amount={agent.stakeOnChain} />
        <EndpointStatus hasEndpoint={agent.hasEndpoint} />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="badge bg-violet-soft text-violet-primary">
          {agent.isPaid ? `${agent.pricePerCall} INFR / call` : "Free"}
        </span>
        {agent.agentType && (
          <span className="badge bg-surface-muted text-foreground/60">{agent.agentType}</span>
        )}
      </div>

      <HoverButton href={`/agents/${agent.id}`} className="mt-auto w-full">
        Use this agent
      </HoverButton>
    </article>
  );
}
