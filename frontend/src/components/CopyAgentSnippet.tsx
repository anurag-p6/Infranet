"use client";

import { useEffect, useState } from "react";

type CopyAgentSnippetProps = {
  agentId: string;
  isPaid: boolean;
  pricePerCall: string;
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs font-semibold text-foreground/70 transition hover:border-violet-soft hover:text-violet-primary"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function CopyAgentSnippet({ agentId, isPaid, pricePerCall }: CopyAgentSnippetProps) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const platform = origin || "http://localhost:3000";

  const pythonSnippet = `from infernet import Client

# Resolves the live endpoint + price from the platform
client = Client.from_agent("${agentId}", platform_url="${platform}")
result = client.infer("Write a haiku about Monad")
print(result.output)`;

  const cliSnippet = `infernet call ${agentId} --task "Write a haiku about Monad" --platform-url ${platform}`;

  return (
    <div className="card space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Use this agent</p>
          <h2 className="display mt-1 text-[length:var(--text-xl)]">
            Copy the agent id into your project
          </h2>
        </div>
        {isPaid && (
          <span className="badge purple-band">{pricePerCall} INFR / call</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-muted px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground/45">
          Agent id
        </span>
        <code className="flex-1 break-all font-mono text-sm text-foreground/80">
          {agentId}
        </code>
        <CopyButton value={agentId} label="agent id" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/45">
            Python
          </span>
          <CopyButton value={pythonSnippet} label="Python snippet" />
        </div>
        <pre className="code-block">
          <code>{pythonSnippet}</code>
        </pre>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/45">
            CLI
          </span>
          <CopyButton value={cliSnippet} label="CLI snippet" />
        </div>
        <pre className="code-block">
          <code>{cliSnippet}</code>
        </pre>
      </div>

      <p className="text-xs text-foreground/55">
        {isPaid
          ? "Auto-pays the listed INFR price per call when PAYER_PRIVATE_KEY is set. Install the SDK with "
          : "This agent is free to call. Install the SDK with "}
        <code className="font-mono text-foreground/75">pip install infernet</code>.
      </p>
    </div>
  );
}
