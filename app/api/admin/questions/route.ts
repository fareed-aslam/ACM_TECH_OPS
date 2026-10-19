import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getQuestions, clearQuestions } from "@/lib/gameService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!verifyAdminToken(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getQuestions();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!verifyAdminToken(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await clearQuestions();
    return NextResponse.json({ ok: true, message: "All questions deleted." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to clear questions" },
      { status: 500 }
    );
  }
}
