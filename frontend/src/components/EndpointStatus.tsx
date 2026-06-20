export function EndpointStatus({ hasEndpoint }: { hasEndpoint: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium">
      <span
        className={`h-2 w-2 rounded-full ${hasEndpoint ? "bg-emerald-500" : "bg-foreground/25"}`}
        aria-hidden
      />
      {hasEndpoint ? "Multiaddr set" : "No endpoint"}
    </span>
  );
}
