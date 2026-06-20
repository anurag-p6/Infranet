import type { InferManifest } from "@/lib/manifests";
import type { AgentRegistryEntry, PlatformRegistry } from "@/lib/server/registry-types";
import {
  getManifestById,
  listManifests,
  loadRegistryFromDb,
  saveAgentManifest,
  updateAgentHeartbeat,
  upsertRegistryEntryInDb,
} from "@/lib/server/db";

export type { AgentRegistryEntry, PlatformRegistry } from "@/lib/server/registry-types";

const HEARTBEAT_TTL_MS = 5 * 60 * 1000;

export function resolveAgentStatus(
  entry: AgentRegistryEntry | undefined,
): AgentRegistryEntry["status"] {
  if (!entry?.last_heartbeat) return entry ? "unknown" : "unknown";
  const age = Date.now() - new Date(entry.last_heartbeat).getTime();
  return age <= HEARTBEAT_TTL_MS ? "online" : "offline";
}

export async function loadRegistry(): Promise<PlatformRegistry> {
  return loadRegistryFromDb();
}

export async function loadManifests(): Promise<InferManifest[]> {
  return listManifests();
}

export async function saveManifest(manifest: InferManifest): Promise<string> {
  await saveAgentManifest(manifest);
  return manifest.agent_id;
}

export async function upsertRegistryEntry(
  agentId: string,
  patch: Partial<AgentRegistryEntry> & { peer_id?: string },
): Promise<AgentRegistryEntry> {
  const entry = await upsertRegistryEntryInDb(agentId, patch);
  entry.status = resolveAgentStatus(entry);
  return entry;
}

export async function recordHeartbeat(
  agentId: string,
  multiaddr: string,
  peerId: string,
): Promise<AgentRegistryEntry> {
  const manifest = await getManifestById(agentId);
  if (!manifest) {
    throw new Error(`Agent '${agentId}' is not listed on the platform`);
  }

  manifest.multiaddr = multiaddr;
  manifest.endpoint = multiaddr;

  const now = new Date().toISOString();
  const entry = await updateAgentHeartbeat(agentId, manifest, peerId, now);
  entry.status = resolveAgentStatus(entry);
  return entry;
}

export function validatePublishKey(request: Request): boolean {
  const expected = process.env.PLATFORM_PUBLISH_KEY;
  if (!expected) return true;
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : request.headers.get("x-infernet-key");
  return token === expected;
}

export function validateManifestPayload(data: unknown): InferManifest {
  if (!data || typeof data !== "object") {
    throw new Error("Manifest must be an object");
  }
  const manifest = data as Record<string, unknown>;
  if (typeof manifest.agent_id !== "string" || !manifest.agent_id.trim()) {
    throw new Error("manifest.agent_id is required");
  }
  if (typeof manifest.model !== "string") {
    throw new Error("manifest.model is required");
  }
  return manifest as InferManifest;
}
