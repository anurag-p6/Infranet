export const infrAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

export const erc8004IdentityAbi = [
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "getAgentWallet",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export const infrAddress =
  (process.env.NEXT_PUBLIC_INFR_CONTRACT as `0x${string}`) ??
  "0xD1758e1205f79C4F2dAc8f6b7D32A2E517835851";

export const erc8004IdentityAddress =
  (process.env.NEXT_PUBLIC_ERC8004_IDENTITY_REGISTRY as `0x${string}`) ??
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

export const erc8004ReputationAddress =
  (process.env.NEXT_PUBLIC_ERC8004_REPUTATION_REGISTRY as `0x${string}`) ??
  "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";

export const defaultRunnerWallet =
  (process.env.NEXT_PUBLIC_RUNNER_WALLET as `0x${string}`) ??
  "0x225fd0b9d011c8bbffd0f0c6f854cd23b99b6af7";

export const infrDecimals = 18;

export const explorerUrl = "https://testnet.monadexplorer.com";
export const faucetUrl = "https://faucet.monad.xyz";

export function txUrl(hash: string) {
  return `${explorerUrl}/tx/${hash}`;
}

export function addressUrl(address: string) {
  return `${explorerUrl}/address/${address}`;
}

export function nftUrl(registry: string, agentId: string) {
  return `${explorerUrl}/nft/${registry}/${agentId}`;
}
