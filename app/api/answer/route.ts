import { NextRequest, NextResponse } from "next/server";
import { submitAnswer } from "@/lib/gameService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid token" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const body = await req.json();
    const { questionNumber, answer } = body;

    if (typeof questionNumber !== "number") {
      return NextResponse.json({ error: "Invalid question number" }, { status: 400 });
    }

    const result = await submitAnswer(token, questionNumber, answer);
    if (!result) {
      return NextResponse.json({ error: "Session invalid or player not found" }, { status: 401 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to submit answer" },
      { status: 500 }
    );
  }
}
