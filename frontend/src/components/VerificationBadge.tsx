import { erc8004IdentityAddress, nftUrl } from "@/lib/contracts";

export function VerificationBadge({
  registered,
  verified,
  agentId,
}: {
  registered: boolean;
  verified: boolean;
  agentId: string;
}) {
  if (!registered) {
    return (
      <span className="badge bg-surface-muted text-foreground/55">
        Not on ERC-8004
      </span>
    );
  }

  if (verified) {
    return (
      <a
        href={nftUrl(erc8004IdentityAddress, agentId)}
        target="_blank"
        rel="noreferrer"
        className="badge bg-violet-soft text-violet-primary hover:opacity-90"
      >
        ERC-8004 #{agentId} verified
      </a>
    );
  }

  return (
    <span className="badge bg-amber-50 text-amber-800">
      ERC-8004 #{agentId} pending sync
    </span>
  );
}
