import { NextRequest, NextResponse } from "next/server";
import { flagTabSwitch } from "@/lib/gameService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      await flagTabSwitch(token);
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to record flag" },
      { status: 500 }
    );
  }
}
