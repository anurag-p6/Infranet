export function StakeBadge({
  staked,
  amount,
}: {
  staked: boolean;
  amount: string;
}) {
  if (staked) {
    return (
      <span className="badge bg-emerald-50 text-emerald-700">
        Bonded · {amount} MON
      </span>
    );
  }

  return (
    <span className="badge bg-surface-muted text-foreground/55">Unbonded</span>
  );
}
