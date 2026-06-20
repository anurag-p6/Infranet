import { NextResponse } from "next/server";
import { recordHeartbeat, validatePublishKey } from "@/lib/server/registry";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  if (!validatePublishKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const agentId = body.agent_id;
    const multiaddr = body.multiaddr;
    const peerId = body.peer_id ?? "";

    if (!agentId || !multiaddr) {
      return NextResponse.json(
        { error: "agent_id and multiaddr are required" },
        { status: 400 },
      );
    }

    const entry = await recordHeartbeat(String(agentId), String(multiaddr), String(peerId));
    return NextResponse.json({ ok: true, registry: entry });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Heartbeat failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
