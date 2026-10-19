import { NextRequest, NextResponse } from "next/server";
import { getPlayState } from "@/lib/gameService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid token" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const state = await getPlayState(token);

    if (!state) {
      return NextResponse.json({ error: "Session expired or player not found" }, { status: 401 });
    }

    return NextResponse.json(state, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch play state" },
      { status: 500 }
    );
  }
}
