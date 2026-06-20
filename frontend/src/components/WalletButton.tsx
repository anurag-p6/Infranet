"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { monadTestnet } from "@/lib/chains";
import { HoverButton } from "@/components/HoverButton";

export function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (isConnected && address) {
    const wrongChain = chainId !== monadTestnet.id;

    return (
      <div className="flex items-center gap-2">
        {wrongChain && (
          <HoverButton
            type="button"
            variant="secondary"
            className="hover-btn--sm"
            onClick={() => switchChain({ chainId: monadTestnet.id })}
          >
            Switch to Monad
          </HoverButton>
        )}
        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded-full border border-border bg-surface-muted px-3 py-2 font-mono text-xs transition hover:border-violet-soft"
        >
          {address.slice(0, 6)}...{address.slice(-4)}
        </button>
      </div>
    );
  }

  return (
    <HoverButton
      type="button"
      disabled={isPending}
      onClick={() => connect({ connector: connectors[0] })}
      className="hover-btn--sm"
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </HoverButton>
  );
}
