import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { importQuestions } from "@/lib/gameService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!verifyAdminToken(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { questions, mode } = body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "Valid questions array is required" },
        { status: 400 }
      );
    }

    const result = await importQuestions(questions, mode || "add");
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to import questions" },
      { status: 500 }
    );
  }
}
