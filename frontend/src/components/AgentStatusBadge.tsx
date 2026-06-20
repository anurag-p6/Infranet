import type { ListedAgent } from "@/lib/agents";

const styles = {
  online: "bg-emerald-500/15 text-emerald-800",
  offline: "bg-red-500/10 text-red-700",
  unknown: "bg-surface-muted text-foreground/55",
} as const;

const labels = {
  online: "Online",
  offline: "Offline",
  unknown: "Unknown",
} as const;

export function AgentStatusBadge({ status }: { status: ListedAgent["status"] }) {
  return (
    <span className={`badge ${styles[status]}`}>
      <span
        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
          status === "online"
            ? "bg-emerald-500"
            : status === "offline"
              ? "bg-red-500"
              : "bg-foreground/30"
        }`}
        aria-hidden
      />
      {labels[status]}
    </span>
  );
}
