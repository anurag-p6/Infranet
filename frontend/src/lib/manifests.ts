export type InferManifest = {
  agent_id: string;
  model: string;
  agent_type: string;
  price_per_call: string;
  price_token: string;
  wallet: string;
  endpoint: string;
  multiaddr: string;
  protocol: string;
  backend: string;
  tools: string[];
  description: string;
  image: string;
  erc8004_agent_id: string;
  erc8004_registry: string;
  erc8004_tx: string;
};

export function manifestToAgent(m: InferManifest) {
  return {
    id: m.agent_id,
    name: m.agent_id,
    model: m.model,
    backend: m.backend as "openclaw" | "ollama" | "custom" | "http",
    description:
      m.description ||
      `${m.backend} agent on ${m.protocol} — ${m.model}`,
    pricePerCall: m.price_per_call || "0",
    priceToken: m.price_token,
    wallet: m.wallet as `0x${string}`,
    multiaddr: m.multiaddr || m.endpoint,
    protocol: m.protocol,
    agentType: m.agent_type,
    erc8004AgentId: m.erc8004_agent_id,
    erc8004Registry: m.erc8004_registry,
    erc8004Tx: m.erc8004_tx,
    hasEndpoint: Boolean(m.multiaddr || m.endpoint),
    isPaid: Number(m.price_per_call) > 0 && Boolean(m.wallet),
    isRegistered: Boolean(m.erc8004_agent_id),
  };
}

export type ManifestAgent = ReturnType<typeof manifestToAgent>;
