import { NextResponse } from "next/server";
import { loadManifests } from "@/lib/server/registry";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const manifests = await loadManifests();
  const manifest = manifests.find((m) => m.agent_id === id);

  if (!manifest) {
    return NextResponse.json(
      { error: `Agent '${id}' is not listed on this platform` },
      { status: 404 },
    );
  }

  return NextResponse.json(manifest);
}
