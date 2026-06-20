import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InferencePanel } from "@/components/InferencePanel";
import { getAgentById } from "@/lib/agents";

export const dynamic = "force-dynamic";

export default async function AgentRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgentById(id);
  if (!agent) notFound();

  const canRun = agent.hasEndpoint && (agent.isPaid ? Boolean(agent.wallet) : true);
  if (!canRun) redirect(`/agents/${id}`);

  return (
    <div className="section-pad">
      <div className="container max-w-3xl">
        <Link
          href={`/agents/${agent.id}`}
          className="text-sm font-medium text-violet-primary hover:underline"
        >
          ← Back to {agent.name}
        </Link>
        <div className="mt-6">
          <InferencePanel agent={agent} />
        </div>
      </div>
    </div>
  );
}
