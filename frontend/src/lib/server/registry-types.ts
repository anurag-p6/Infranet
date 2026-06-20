export type AgentRegistryEntry = {
  agent_id: string;
  published_at: string;
  updated_at: string;
  last_heartbeat: string | null;
  peer_id: string;
  status: "online" | "offline" | "unknown";
};

export type PlatformRegistry = {
  agents: Record<string, AgentRegistryEntry>;
};
