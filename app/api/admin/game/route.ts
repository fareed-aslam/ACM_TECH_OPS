import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getAdminGameStatus } from "@/lib/gameService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!verifyAdminToken(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getAdminGameStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch game status" },
      { status: 500 }
    );
  }
}
