import { NextResponse } from "next/server";
import { getAgentById, getLiveAgents, type AgentFilters } from "@/lib/agents";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters: AgentFilters = {
    backend: searchParams.get("backend") ?? undefined,
    paid: searchParams.get("paid") === "1",
    free: searchParams.get("free") === "1",
    verified: searchParams.get("verified") === "1",
    online: searchParams.get("online") === "1",
    query: searchParams.get("q") ?? undefined,
  };

  const agents = await getLiveAgents(filters);
  return NextResponse.json({ agents, count: agents.length, filters });
}
