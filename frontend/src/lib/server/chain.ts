import { createPublicClient, http } from "viem";
import { monadTestnet } from "@/lib/chains";
import {
  erc8004IdentityAbi,
  erc8004IdentityAddress,
  infrAbi,
  infrAddress,
} from "@/lib/contracts";

const rpcUrl =
  process.env.NEXT_PUBLIC_MONAD_RPC ?? "https://testnet-rpc.monad.xyz";

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(rpcUrl, { timeout: 12_000 }),
});

export async function fetchNetworkStats() {
  const [blockNumber, chainId, tokenName, tokenSymbol, tokenDecimals, registryAgents] =
    await Promise.all([
      publicClient.getBlockNumber(),
      publicClient.getChainId(),
      publicClient.readContract({
        address: infrAddress,
        abi: infrAbi,
        functionName: "name",
      }),
      publicClient.readContract({
        address: infrAddress,
        abi: infrAbi,
        functionName: "symbol",
      }),
      publicClient.readContract({
        address: infrAddress,
        abi: infrAbi,
        functionName: "decimals",
      }),
      publicClient
        .readContract({
          address: erc8004IdentityAddress,
          abi: erc8004IdentityAbi,
          functionName: "totalSupply",
        })
        .catch(() => BigInt(0)),
    ]);

  return {
    blockNumber: blockNumber.toString(),
    chainId,
    rpcUrl,
    token: {
      address: infrAddress,
      name: tokenName,
      symbol: tokenSymbol,
      decimals: Number(tokenDecimals),
    },
    erc8004: {
      identityRegistry: erc8004IdentityAddress,
      totalAgents: registryAgents.toString(),
    },
    fetchedAt: new Date().toISOString(),
  };
}

export async function verifyErc8004Agent(agentId: string): Promise<boolean> {
  if (!agentId || !/^\d+$/.test(agentId)) return false;
  try {
    await publicClient.readContract({
      address: erc8004IdentityAddress,
      abi: erc8004IdentityAbi,
      functionName: "ownerOf",
      args: [BigInt(agentId)],
    });
    return true;
  } catch {
    return false;
  }
}
