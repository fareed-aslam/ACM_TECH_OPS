import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/gameService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getLeaderboard();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=2, stale-while-revalidate=4",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
