"use client";

import { useEffect, useState } from "react";

type NetworkStats = {
  blockNumber: string;
  chainId: number;
  token: { symbol: string; name: string; address: string };
  erc8004: { totalAgents: string; identityRegistry: string };
  fetchedAt: string;
};

type AgentsResponse = {
  count: number;
};

export function LiveStats() {
  const [network, setNetwork] = useState<NetworkStats | null>(null);
  const [agentCount, setAgentCount] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [netRes, agentsRes] = await Promise.all([
          fetch("/api/network", { cache: "no-store" }),
          fetch("/api/agents", { cache: "no-store" }),
        ]);
        if (netRes.ok) setNetwork(await netRes.json());
        else setError(true);
        if (agentsRes.ok) {
          const data = (await agentsRes.json()) as AgentsResponse;
          setAgentCount(data.count);
        }
      } catch {
        setError(true);
      }
    }

    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  const updated = network?.fetchedAt
    ? new Date(network.fetchedAt).toLocaleTimeString()
    : "—";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Monad block"
        value={network?.blockNumber ?? (error ? "Offline" : "…")}
        hint={`Chain ${network?.chainId ?? 10143} · updated ${updated}`}
      />
      <StatCard
        label="Listed manifests"
        value={agentCount !== null ? String(agentCount) : "…"}
        hint="From Neon Postgres"
      />
      <StatCard
        label="ERC-8004 agents"
        value={network?.erc8004.totalAgents ?? (error ? "—" : "…")}
        hint="Identity Registry totalSupply"
      />
      <StatCard
        label="Payment token"
        value={network?.token.symbol ?? "INFR"}
        hint={network?.token.name ?? "InferNet token"}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="card p-5">
      <p className="section-label">{label}</p>
      <p className="stat-value mt-2 text-violet-primary">{value}</p>
      <p className="mt-2 text-xs text-foreground/55">{hint}</p>
    </div>
  );
}
