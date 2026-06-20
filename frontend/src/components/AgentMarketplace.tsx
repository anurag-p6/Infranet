"use client";

import { useCallback, useEffect, useState } from "react";
import { AgentCard } from "@/components/AgentCard";
import type { ListedAgent } from "@/lib/agents";

type Filters = {
  q: string;
  backend: string;
  paid: boolean;
  free: boolean;
  verified: boolean;
  online: boolean;
};

const defaultFilters: Filters = {
  q: "",
  backend: "",
  paid: false,
  free: false,
  verified: false,
  online: false,
};

export function AgentMarketplace({ backends }: { backends: string[] }) {
  const [agents, setAgents] = useState<ListedAgent[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [loading, setLoading] = useState(true);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.backend) params.set("backend", filters.backend);
    if (filters.paid) params.set("paid", "1");
    if (filters.free) params.set("free", "1");
    if (filters.verified) params.set("verified", "1");
    if (filters.online) params.set("online", "1");

    const res = await fetch(`/api/agents?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setAgents(data.agents ?? []);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadAgents();
    const id = setInterval(loadAgents, 30_000);
    return () => clearInterval(id);
  }, [loadAgents]);

  return (
    <div>
      <div className="card mb-8 flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <label htmlFor="agent-search" className="section-label">
            Find an agent
          </label>
          <input
            id="agent-search"
            type="search"
            placeholder="Search by name, model, backend..."
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Filter by backend"
            value={filters.backend}
            onChange={(e) => setFilters((f) => ({ ...f, backend: e.target.value }))}
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">All backends</option>
            {backends.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <FilterToggle
            label="Free"
            active={filters.free}
            onClick={() => setFilters((f) => ({ ...f, free: !f.free, paid: false }))}
          />
          <FilterToggle
            label="Paid"
            active={filters.paid}
            onClick={() => setFilters((f) => ({ ...f, paid: !f.paid, free: false }))}
          />
          <FilterToggle
            label="Verified"
            active={filters.verified}
            onClick={() => setFilters((f) => ({ ...f, verified: !f.verified }))}
          />
          <FilterToggle
            label="Online"
            active={filters.online}
            onClick={() => setFilters((f) => ({ ...f, online: !f.online }))}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card h-48 animate-pulse bg-surface-muted" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="card p-8 text-center text-foreground/60">
          No agents match your filters. Providers list agents with{" "}
          <code className="font-mono text-xs">infernet serve --publish</code>.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-violet-primary bg-violet-soft text-violet-primary"
          : "border-border bg-white text-foreground/70 hover:border-violet-soft"
      }`}
    >
      {label}
    </button>
  );
}
