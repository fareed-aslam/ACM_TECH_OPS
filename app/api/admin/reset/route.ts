import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { resetGame } from "@/lib/gameService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!verifyAdminToken(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await resetGame();
    return NextResponse.json({ ok: true, message: "Players cleared and game reset to lobby." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to reset game" },
      { status: 500 }
    );
  }
}
