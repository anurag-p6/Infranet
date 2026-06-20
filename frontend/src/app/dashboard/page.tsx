import Link from "next/link";
import { getLiveAgents } from "@/lib/agents";
import { VerificationBadge } from "@/components/VerificationBadge";
import { HoverButton } from "@/components/HoverButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const agents = await getLiveAgents();

  return (
    <div className="section-pad">
      <div className="container max-w-4xl">
        <p className="section-label">Provider</p>
        <h1 className="display mt-3 text-[length:var(--text-3xl)]">Dashboard</h1>
        <p className="prose-narrow mt-3">
          Agents discovered from manifests/. Connect your wallet on the List page to check INFR
          balance before going live.
        </p>

        <div className="mt-8 space-y-4">
          {agents.length === 0 ? (
            <div className="card p-6 text-sm text-foreground/60">
              No manifests yet.{" "}
              <Link href="/list" className="text-violet-primary hover:underline">
                List your first agent
              </Link>
            </div>
          ) : (
            agents.map((agent) => (
              <div key={agent.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="display text-xl">{agent.name}</h2>
                    <p className="mt-1 text-sm text-foreground/60">
                      {agent.isPaid ? `${agent.pricePerCall} INFR per call` : "Free agent"}
                    </p>
                  </div>
                  <HoverButton href={`/agents/${agent.id}`} variant="secondary" className="hover-btn--sm">
                    View
                  </HoverButton>
                </div>
                <div className="mt-4">
                  <VerificationBadge
                    registered={agent.isRegistered}
                    verified={agent.onChainVerified}
                    agentId={agent.erc8004AgentId}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
