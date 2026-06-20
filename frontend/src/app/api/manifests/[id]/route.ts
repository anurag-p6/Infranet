import { NextResponse } from "next/server";
import { getManifestById } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const manifest = await getManifestById(id);

  if (!manifest) {
    return NextResponse.json(
      { error: `Agent '${id}' is not listed on this platform` },
      { status: 404 },
    );
  }

  return NextResponse.json(manifest);
}

