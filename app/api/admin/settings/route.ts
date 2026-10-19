import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { updateGameSettings } from "@/lib/gameService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!verifyAdminToken(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const updated = await updateGameSettings(body);
    return NextResponse.json({ ok: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}
