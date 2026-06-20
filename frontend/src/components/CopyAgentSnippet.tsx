"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildCliSnippet,
  buildEnvSnippet,
  buildFullSetupSnippet,
  buildInstallSnippet,
  buildPythonSnippet,
  type ConsumerSnippetInput,
} from "@/lib/consumerSnippet";

type CopyAgentSnippetProps = {
  agentId: string;
  isPaid: boolean;
  pricePerCall: string;
  isVerified?: boolean;
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

function SnippetBlock({
  step,
  title,
  hint,
  code,
  copyLabel,
}: {
  step: string;
  title: string;
  hint?: string;
  code: string;
  copyLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-violet-primary">
            {step}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground/85">{title}</p>
          {hint && <p className="mt-1 text-xs text-foreground/55">{hint}</p>}
        </div>
        <CopyButton value={code} label={copyLabel} />
      </div>
      <pre className="code-block">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function CopyAgentSnippet({
  agentId,
  isPaid,
  pricePerCall,
  isVerified = false,
}: CopyAgentSnippetProps) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const input: ConsumerSnippetInput = useMemo(
    () => ({
      agentId,
      platformUrl: origin || "http://localhost:3000",
      isPaid,
      pricePerCall,
      isVerified,
    }),
    [agentId, origin, isPaid, pricePerCall, isVerified],
  );

  const installSnippet = buildInstallSnippet();
  const envSnippet = buildEnvSnippet(input);
  const pythonSnippet = buildPythonSnippet(input);
  const cliSnippet = buildCliSnippet(input);
  const fullSnippet = buildFullSetupSnippet(input);

  return (
    <div className="card space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Consumer SDK</p>
          <h2 className="display mt-1 text-[length:var(--text-xl)]">
            Drop this agent into your project
          </h2>
          <p className="mt-2 max-w-xl text-sm text-foreground/65">
            Copy each block below. Only{" "}
            <code className="font-mono text-xs text-foreground/80">AGENT_ID</code> and your task
            need to change — the SDK resolves the live endpoint and price from the platform.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPaid && (
            <span className="badge purple-band">{pricePerCall} INFR / call</span>
          )}
          <CopyButton value={fullSnippet} label="full setup" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-muted px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground/45">
          Agent id
        </span>
        <code className="flex-1 break-all font-mono text-sm text-foreground/80">{agentId}</code>
        <CopyButton value={agentId} label="agent id" />
      </div>

      <SnippetBlock
        step="Step 1"
        title="Install the infernet package"
        hint="Requires Python 3.10+"
        code={installSnippet}
        copyLabel="install snippet"
      />

      <SnippetBlock
        step="Step 2"
        title="Set environment variables"
        hint={
          isPaid
            ? "PAYER_PRIVATE_KEY sends INFR automatically on each call."
            : "Platform URL lets the SDK resolve this agent's manifest."
        }
        code={envSnippet}
        copyLabel="environment snippet"
      />

      <SnippetBlock
        step="Step 3"
        title="Call the agent from Python"
        hint='Replace "Your task here" with your prompt.'
        code={pythonSnippet}
        copyLabel="Python snippet"
      />

      <SnippetBlock
        step="Step 4"
        title="Or use the CLI"
        code={cliSnippet}
        copyLabel="CLI snippet"
      />
    </div>
  );
}
