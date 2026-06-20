import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { InferManifest } from "@/lib/manifests";

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

const HEARTBEAT_TTL_MS = 5 * 60 * 1000;

function repoRoot(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "..");
}

export function manifestsDir(): string {
  return (
    process.env.MANIFESTS_DIR ??
    path.join(/* turbopackIgnore: true */ repoRoot(), "manifests")
  );
}

export function registryPath(): string {
  return (
    process.env.PLATFORM_REGISTRY_PATH ??
    path.join(/* turbopackIgnore: true */ repoRoot(), "platform", "registry.json")
  );
}

export async function loadRegistry(): Promise<PlatformRegistry> {
  try {
    const raw = await readFile(registryPath(), "utf-8");
    return JSON.parse(raw) as PlatformRegistry;
  } catch {
    return { agents: {} };
  }
}

async function saveRegistry(registry: PlatformRegistry): Promise<void> {
  const file = registryPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(registry, null, 2), "utf-8");
}

export function resolveAgentStatus(entry: AgentRegistryEntry | undefined): AgentRegistryEntry["status"] {
  if (!entry?.last_heartbeat) return entry ? "unknown" : "unknown";
  const age = Date.now() - new Date(entry.last_heartbeat).getTime();
  return age <= HEARTBEAT_TTL_MS ? "online" : "offline";
}

export async function loadManifests(): Promise<InferManifest[]> {
  const dir = manifestsDir();
  let files: string[];
  try {
    const { readdir } = await import("node:fs/promises");
    files = await readdir(dir);
  } catch {
    return [];
  }

  const manifests: InferManifest[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(path.join(dir, file), "utf-8");
      manifests.push(JSON.parse(raw) as InferManifest);
    } catch {
      // skip invalid manifest files
    }
  }
  return manifests;
}

export async function saveManifest(manifest: InferManifest): Promise<string> {
  const dir = manifestsDir();
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${manifest.agent_id}.json`);
  await writeFile(filePath, JSON.stringify(manifest, null, 2), "utf-8");
  return filePath;
}

export async function upsertRegistryEntry(
  agentId: string,
  patch: Partial<AgentRegistryEntry> & { peer_id?: string },
): Promise<AgentRegistryEntry> {
  const registry = await loadRegistry();
  const now = new Date().toISOString();
  const existing = registry.agents[agentId];

  const entry: AgentRegistryEntry = {
    agent_id: agentId,
    published_at: existing?.published_at ?? now,
    updated_at: now,
    last_heartbeat: patch.last_heartbeat ?? existing?.last_heartbeat ?? null,
    peer_id: patch.peer_id ?? existing?.peer_id ?? "",
    status: "unknown",
  };

  registry.agents[agentId] = entry;
  entry.status = resolveAgentStatus(entry);
  await saveRegistry(registry);
  return entry;
}

export async function recordHeartbeat(
  agentId: string,
  multiaddr: string,
  peerId: string,
): Promise<AgentRegistryEntry> {
  const manifests = await loadManifests();
  const manifest = manifests.find((m) => m.agent_id === agentId);
  if (!manifest) {
    throw new Error(`Agent '${agentId}' is not listed on the platform`);
  }

  manifest.multiaddr = multiaddr;
  manifest.endpoint = multiaddr;
  await saveManifest(manifest);

  const now = new Date().toISOString();
  return upsertRegistryEntry(agentId, {
    peer_id: peerId,
    last_heartbeat: now,
  });
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
