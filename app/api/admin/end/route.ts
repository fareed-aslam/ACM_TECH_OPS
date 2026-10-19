import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { endGame } from "@/lib/gameService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!verifyAdminToken(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const game = await endGame();
    return NextResponse.json({ ok: true, game });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to end game" },
      { status: 500 }
    );
  }
}
