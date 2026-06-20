import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import type { InferManifest } from "@/lib/manifests";
import type { AgentRegistryEntry, PlatformRegistry } from "@/lib/server/registry-types";

type SqlClient = ReturnType<typeof neon>;

type AgentMetaRow = {
  peer_id: string;
  published_at: string;
  last_heartbeat: string | null;
};

type AgentFullRow = AgentMetaRow & {
  manifest_json: InferManifest | string;
};

function asRows<T>(result: unknown): T[] {
  return result as T[];
}

function repoRoot(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "..");
}

function manifestsDir(): string {
  return (
    process.env.MANIFESTS_DIR ??
    path.join(/* turbopackIgnore: true */ repoRoot(), "manifests")
  );
}

function registryPath(): string {
  return (
    process.env.PLATFORM_REGISTRY_PATH ??
    path.join(/* turbopackIgnore: true */ repoRoot(), "platform", "registry.json")
  );
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon Postgres connection string to frontend/.env.local",
    );
  }
  return url;
}

let sqlClient: SqlClient | null = null;
let initPromise: Promise<void> | null = null;

function getSql(): SqlClient {
  if (!sqlClient) {
    sqlClient = neon(getDatabaseUrl());
  }
  return sqlClient;
}

function parseManifest(value: InferManifest | string): InferManifest {
  if (typeof value === "string") {
    return JSON.parse(value) as InferManifest;
  }
  return value;
}

async function initSchema(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS agents (
      agent_id TEXT PRIMARY KEY,
      manifest_json JSONB NOT NULL,
      peer_id TEXT NOT NULL DEFAULT '',
      published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_heartbeat TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_agents_updated_at ON agents (updated_at DESC)
  `;
}

async function migrateFromLegacyFiles(): Promise<void> {
  const sql = getSql();
  const countRows = asRows<{ n: number }>(await sql`SELECT COUNT(*)::int AS n FROM agents`);
  const count = countRows[0]?.n ?? 0;
  if (count > 0) return;

  let registry: PlatformRegistry = { agents: {} };
  try {
    registry = JSON.parse(readFileSync(registryPath(), "utf-8")) as PlatformRegistry;
  } catch {
    // no legacy registry
  }

  const dir = manifestsDir();
  if (!existsSync(dir)) return;

  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const manifest = JSON.parse(
        readFileSync(path.join(dir, file), "utf-8"),
      ) as InferManifest;
      if (typeof manifest.agent_id !== "string" || !manifest.agent_id.trim()) continue;

      const entry = registry.agents[manifest.agent_id];
      const now = new Date().toISOString();
      await sql`
        INSERT INTO agents (agent_id, manifest_json, peer_id, published_at, updated_at, last_heartbeat)
        VALUES (
          ${manifest.agent_id},
          ${JSON.stringify(manifest)}::jsonb,
          ${entry?.peer_id ?? ""},
          ${entry?.published_at ?? now},
          ${entry?.updated_at ?? now},
          ${entry?.last_heartbeat ?? null}
        )
        ON CONFLICT (agent_id) DO NOTHING
      `;
    } catch {
      // skip invalid manifest files
    }
  }
}

async function ensureReady(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await initSchema();
      await migrateFromLegacyFiles();
    })();
  }
  await initPromise;
}

export async function listManifests(): Promise<InferManifest[]> {
  await ensureReady();
  const sql = getSql();
  const rows = asRows<{ manifest_json: InferManifest | string }>(
    await sql`
    SELECT manifest_json
    FROM agents
    ORDER BY updated_at DESC
  `,
  );

  return rows.map((row) => parseManifest(row.manifest_json as InferManifest | string));
}

export async function getManifestById(agentId: string): Promise<InferManifest | null> {
  await ensureReady();
  const sql = getSql();
  const rows = asRows<{ manifest_json: InferManifest | string }>(
    await sql`
    SELECT manifest_json
    FROM agents
    WHERE agent_id = ${agentId}
    LIMIT 1
  `,
  );

  if (!rows.length) return null;
  return parseManifest(rows[0].manifest_json as InferManifest | string);
}

export async function saveAgentManifest(manifest: InferManifest): Promise<void> {
  await ensureReady();
  const sql = getSql();
  const now = new Date().toISOString();

  const existingRows = asRows<AgentMetaRow>(
    await sql`
    SELECT peer_id, published_at, last_heartbeat
    FROM agents
    WHERE agent_id = ${manifest.agent_id}
    LIMIT 1
  `,
  );
  const existing = existingRows[0] as AgentMetaRow | undefined;

  await sql`
    INSERT INTO agents (agent_id, manifest_json, peer_id, published_at, updated_at, last_heartbeat)
    VALUES (
      ${manifest.agent_id},
      ${JSON.stringify(manifest)}::jsonb,
      ${existing?.peer_id ?? ""},
      ${existing?.published_at ?? now},
      ${now},
      ${existing?.last_heartbeat ?? null}
    )
    ON CONFLICT (agent_id) DO UPDATE SET
      manifest_json = EXCLUDED.manifest_json,
      updated_at = EXCLUDED.updated_at
  `;
}

export async function loadRegistryFromDb(): Promise<PlatformRegistry> {
  await ensureReady();
  const sql = getSql();
  const rows = asRows<{
    agent_id: string;
    peer_id: string;
    published_at: string;
    updated_at: string;
    last_heartbeat: string | null;
  }>(
    await sql`
    SELECT agent_id, peer_id, published_at, updated_at, last_heartbeat
    FROM agents
  `,
  );

  const agents: Record<string, AgentRegistryEntry> = {};
  for (const row of rows) {
    agents[row.agent_id] = {
      agent_id: row.agent_id,
      peer_id: row.peer_id,
      published_at: new Date(row.published_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      last_heartbeat: row.last_heartbeat
        ? new Date(row.last_heartbeat).toISOString()
        : null,
      status: "unknown",
    };
  }

  return { agents };
}

export async function upsertRegistryEntryInDb(
  agentId: string,
  patch: Partial<AgentRegistryEntry> & { peer_id?: string },
): Promise<AgentRegistryEntry> {
  await ensureReady();
  const sql = getSql();
  const now = new Date().toISOString();

  const existingRows = asRows<AgentFullRow>(
    await sql`
    SELECT manifest_json, peer_id, published_at, last_heartbeat
    FROM agents
    WHERE agent_id = ${agentId}
    LIMIT 1
  `,
  );
  const existing = existingRows[0] as AgentFullRow | undefined;

  if (!existing) {
    throw new Error(`Agent '${agentId}' is not listed on the platform`);
  }

  const entry: AgentRegistryEntry = {
    agent_id: agentId,
    published_at: new Date(existing.published_at).toISOString(),
    updated_at: now,
    last_heartbeat: patch.last_heartbeat ?? existing.last_heartbeat ?? null,
    peer_id: patch.peer_id ?? existing.peer_id ?? "",
    status: "unknown",
  };

  await sql`
    UPDATE agents
    SET peer_id = ${entry.peer_id},
        updated_at = ${entry.updated_at},
        last_heartbeat = ${entry.last_heartbeat}
    WHERE agent_id = ${agentId}
  `;

  return entry;
}

export async function updateAgentHeartbeat(
  agentId: string,
  manifest: InferManifest,
  peerId: string,
  heartbeatAt: string,
): Promise<AgentRegistryEntry> {
  await ensureReady();
  const sql = getSql();

  const existingRows = asRows<{ published_at: string }>(
    await sql`
    SELECT published_at
    FROM agents
    WHERE agent_id = ${agentId}
    LIMIT 1
  `,
  );
  const existing = existingRows[0] as { published_at: string } | undefined;

  if (!existing) {
    throw new Error(`Agent '${agentId}' is not listed on the platform`);
  }

  await sql`
    UPDATE agents
    SET manifest_json = ${JSON.stringify(manifest)}::jsonb,
        peer_id = ${peerId},
        updated_at = ${heartbeatAt},
        last_heartbeat = ${heartbeatAt}
    WHERE agent_id = ${agentId}
  `;

  return {
    agent_id: agentId,
    published_at: new Date(existing.published_at).toISOString(),
    updated_at: heartbeatAt,
    last_heartbeat: heartbeatAt,
    peer_id: peerId,
    status: "unknown",
  };
}
