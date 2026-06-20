import { NextResponse } from "next/server";
import {
  loadRegistry,
  resolveAgentStatus,
  saveManifest,
  upsertRegistryEntry,
  validateManifestPayload,
  validatePublishKey,
} from "@/lib/server/registry";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  if (!validatePublishKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const manifest = validateManifestPayload(body.manifest ?? body);
    const peerId = typeof body.peer_id === "string" ? body.peer_id : "";

    await saveManifest(manifest);
    const entry = await upsertRegistryEntry(manifest.agent_id, {
      peer_id: peerId,
      last_heartbeat: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      agent_id: manifest.agent_id,
      url: `/agents/${manifest.agent_id}`,
      registry: entry,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid manifest";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const registry = await loadRegistry();
  const agents = Object.values(registry.agents).map((entry) => ({
    ...entry,
    status: resolveAgentStatus(entry),
  }));
  return NextResponse.json({ agents, count: agents.length });
}
