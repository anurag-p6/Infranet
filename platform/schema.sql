-- InferNet platform agent listings (Neon Postgres)
-- Run once in the Neon SQL editor, or let the app create this on startup.

CREATE TABLE IF NOT EXISTS agents (
  agent_id TEXT PRIMARY KEY,
  manifest_json JSONB NOT NULL,
  peer_id TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agents_updated_at ON agents (updated_at DESC);
