import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { extendGame } from "@/lib/gameService";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!verifyAdminToken(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const minutes = Number(body.minutes) || 2;
    const game = await extendGame(minutes);
    return NextResponse.json({ ok: true, game });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to extend game" },
      { status: 500 }
    );
  }
}
