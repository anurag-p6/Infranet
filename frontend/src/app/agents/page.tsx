import { AgentMarketplace } from "@/components/AgentMarketplace";
import { getAgentBackends, getLiveAgents } from "@/lib/agents";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await getLiveAgents();
  const backends = getAgentBackends(agents);

  return (
    <div className="section-pad">
      <div className="container">
        <p className="section-label">Marketplace</p>
        <h1 className="display mt-3 text-[length:var(--text-3xl)]">Choose an agent</h1>
        <p className="prose-narrow mt-3">
          Providers list agents from the Python SDK. Filter by backend, price, verification,
          and live status — then run inference from the agent page.
        </p>

        <div className="mt-10">
          <AgentMarketplace backends={backends} />
        </div>
      </div>
    </div>
  );
}
