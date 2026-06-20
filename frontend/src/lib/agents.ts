import { loadManifests } from "@/lib/server/manifests";
import { loadRegistry, resolveAgentStatus } from "@/lib/server/registry";
import { verifyErc8004Agent } from "@/lib/server/chain";
import { manifestToAgent, type ManifestAgent } from "@/lib/manifests";

export type ListedAgent = ManifestAgent & {
  onChainVerified: boolean;
  publishedAt: string | null;
  updatedAt: string | null;
  lastHeartbeat: string | null;
  status: "online" | "offline" | "unknown";
  peerId: string;
};

export type AgentFilters = {
  backend?: string;
  paid?: boolean;
  free?: boolean;
  verified?: boolean;
  online?: boolean;
  query?: string;
};

export async function getLiveAgents(filters: AgentFilters = {}): Promise<ListedAgent[]> {
  const [manifests, registry] = await Promise.all([loadManifests(), loadRegistry()]);

  const agents = await Promise.all(
    manifests.map(async (manifest) => {
      const agent = manifestToAgent(manifest);
      const entry = registry.agents[manifest.agent_id];
      const onChainVerified = agent.erc8004AgentId
        ? await verifyErc8004Agent(agent.erc8004AgentId)
        : false;

      return {
        ...agent,
        onChainVerified,
        publishedAt: entry?.published_at ?? null,
        updatedAt: entry?.updated_at ?? null,
        lastHeartbeat: entry?.last_heartbeat ?? null,
        peerId: entry?.peer_id ?? "",
        status: resolveAgentStatus(entry),
      };
    }),
  );

  return applyFilters(agents, filters);
}

export async function getAgentById(id: string): Promise<ListedAgent | undefined> {
  const agents = await getLiveAgents();
  return agents.find((agent) => agent.id === id);
}

function applyFilters(agents: ListedAgent[], filters: AgentFilters): ListedAgent[] {
  let result = agents;

  if (filters.backend) {
    result = result.filter((a) => a.backend === filters.backend);
  }
  if (filters.paid) {
    result = result.filter((a) => a.isPaid);
  }
  if (filters.free) {
    result = result.filter((a) => !a.isPaid);
  }
  if (filters.verified) {
    result = result.filter((a) => a.onChainVerified);
  }
  if (filters.online) {
    result = result.filter((a) => a.status === "online");
  }
  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.backend.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q),
    );
  }

  return result.sort((a, b) => {
    const aTime = a.updatedAt ?? "";
    const bTime = b.updatedAt ?? "";
    return bTime.localeCompare(aTime);
  });
}

export function getAgentBackends(agents: ListedAgent[]): string[] {
  return [...new Set(agents.map((a) => a.backend))].sort();
}
