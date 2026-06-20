import { NextResponse } from "next/server";
import { fetchNetworkStats } from "@/lib/server/chain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const stats = await fetchNetworkStats();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json(
      { error: "Could not reach Monad RPC", fetchedAt: new Date().toISOString() },
      { status: 503 },
    );
  }
}
