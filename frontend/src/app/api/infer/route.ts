import { NextResponse } from "next/server";
import { createPublicClient, http, parseUnits } from "viem";
import { monadTestnet } from "@/lib/chains";
import { getAgentById } from "@/lib/agents";
import { infrAddress } from "@/lib/contracts";

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

const gatewayUrl = process.env.INFERNET_GATEWAY_URL ?? "http://127.0.0.1:8787";

async function verifyPayment(
  paymentTx: string,
  runnerWallet: string,
  pricePerCall: string,
) {
  const receipt = await publicClient.getTransactionReceipt({
    hash: paymentTx as `0x${string}`,
  });

  if (receipt.status !== "success") {
    throw new Error("Payment transaction failed");
  }

  const minAmount = parseUnits(String(pricePerCall ?? "0"), 18);
  const transferEvent = receipt.logs.find(
    (log) =>
      log.address.toLowerCase() === infrAddress.toLowerCase() &&
      log.topics[0] ===
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  );

  if (!transferEvent) {
    throw new Error("No INFR transfer found in tx");
  }

  const to = `0x${transferEvent.topics[2]?.slice(26)}` as string;
  if (to.toLowerCase() !== String(runnerWallet).toLowerCase()) {
    throw new Error("Payment sent to wrong wallet");
  }

  const amount = BigInt(transferEvent.data);
  if (amount < minAmount) {
    throw new Error("Payment amount too low");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { task, paymentTx, runnerWallet, pricePerCall, agentId, maxTokens } = body;

    if (!task || !agentId) {
      return NextResponse.json({ error: "task and agentId are required" }, { status: 400 });
    }

    const agent = await getAgentById(String(agentId));
    if (!agent) {
      return NextResponse.json({ error: "Agent not found on platform" }, { status: 404 });
    }

    if (!agent.multiaddr) {
      return NextResponse.json({ error: "Agent has no libp2p multiaddr" }, { status: 400 });
    }

    const isPaid = Number(agent.pricePerCall) > 0;
    if (isPaid) {
      if (!paymentTx || !runnerWallet) {
        return NextResponse.json({ error: "Payment required" }, { status: 402 });
      }
      await verifyPayment(paymentTx, runnerWallet, pricePerCall ?? agent.pricePerCall);
    }

    const gatewayRes = await fetch(`${gatewayUrl}/v1/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        multiaddr: agent.multiaddr,
        task,
        payment_tx: paymentTx ?? "",
        max_tokens: maxTokens ?? 512,
        auto_pay: false,
      }),
    });

    if (!gatewayRes.ok) {
      const err = await gatewayRes.json().catch(() => ({}));
      const message =
        typeof err.detail === "string"
          ? err.detail
          : err.error ?? "Gateway inference failed. Start: infernet-gateway";
      return NextResponse.json({ error: message }, { status: gatewayRes.status });
    }

    const data = await gatewayRes.json();
    return NextResponse.json({
      output: data.output,
      paymentTx: data.payment_tx ?? paymentTx ?? "",
      tokensUsed: data.tokens_used ?? 0,
      agentId: data.agent_id ?? agentId,
      runnerPeerId: data.runner_peer_id ?? agent.peerId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Inference failed";
    const status = message.includes("Payment") ? 402 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
