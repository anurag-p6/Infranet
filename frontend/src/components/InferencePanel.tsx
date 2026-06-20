"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits } from "viem";
import type { ListedAgent } from "@/lib/agents";
import { infrAbi, infrAddress, txUrl } from "@/lib/contracts";
import { HoverButton } from "@/components/HoverButton";

type InferResult = {
  output: string;
  paymentTx: string;
  tokensUsed?: number;
};

async function runInference(
  agent: ListedAgent,
  task: string,
  paymentTx = "",
): Promise<InferResult> {
  const response = await fetch("/api/infer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId: agent.id,
      task,
      paymentTx,
      runnerWallet: agent.wallet,
      pricePerCall: agent.pricePerCall,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Inference failed");
  }

  return response.json() as Promise<InferResult>;
}

export function InferencePanel({ agent }: { agent: ListedAgent }) {
  const { isConnected } = useAccount();
  const [task, setTask] = useState("");
  const [result, setResult] = useState<InferResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inferring, setInferring] = useState(false);

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!agent.isPaid || !isSuccess || !hash || result || inferring) return;

    setInferring(true);
    setError(null);
    runInference(agent, task, hash)
      .then(setResult)
      .catch((err: Error) => setError(err.message))
      .finally(() => setInferring(false));
  }, [isSuccess, hash, result, inferring, agent, task]);

  async function handleFreeRun() {
    setError(null);
    setResult(null);
    if (!task.trim()) {
      setError("Enter a prompt.");
      return;
    }
    setInferring(true);
    try {
      const data = await runInference(agent, task);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inference failed");
    } finally {
      setInferring(false);
    }
  }

  function handlePaidRun() {
    setError(null);
    setResult(null);
    reset();

    if (!isConnected) {
      setError("Connect your wallet first.");
      return;
    }
    if (!task.trim()) {
      setError("Enter a prompt.");
      return;
    }

    writeContract({
      address: infrAddress,
      abi: infrAbi,
      functionName: "transfer",
      args: [agent.wallet, parseUnits(agent.pricePerCall, 18)],
    });
  }

  const busy = isPending || isConfirming || inferring;
  const gatewayHint =
    agent.status === "offline"
      ? "Agent may be offline. Ensure the provider is running infernet serve --publish."
      : "Requires infernet-gateway running locally.";

  return (
    <div className="card space-y-5 p-6">
      <div>
        <h2 className="display text-xl">Run inference</h2>
        <p className="mt-1 text-sm text-foreground/60">
          {agent.isPaid
            ? `Pay ${agent.pricePerCall} INFR on Monad, then call the agent via the gateway.`
            : "Free agent — calls go through the InferNet gateway to the provider's libp2p runner."}
        </p>
        <p className="mt-2 text-xs text-foreground/45">{gatewayHint}</p>
      </div>

      <label htmlFor="infer-task" className="sr-only">
        Task prompt
      </label>
      <textarea
        id="infer-task"
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="Ask the agent anything..."
        rows={4}
        className="w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm outline-none focus:border-violet-primary"
      />

      <HoverButton
        type="button"
        onClick={agent.isPaid ? handlePaidRun : handleFreeRun}
        disabled={busy}
        className="w-full"
      >
        {busy
          ? "Processing..."
          : agent.isPaid
            ? `Pay ${agent.pricePerCall} INFR & Run`
            : "Run agent"}
      </HoverButton>

      {(error || writeError) && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error ?? writeError?.message}
        </p>
      )}

      {result && (
        <div className="space-y-4 rounded-xl bg-surface-muted p-4">
          <div>
            <p className="section-label">Output</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{result.output}</p>
          </div>
          {result.paymentTx && (
            <a
              href={txUrl(result.paymentTx)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-violet-primary hover:underline"
            >
              View payment on Monad Explorer →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
