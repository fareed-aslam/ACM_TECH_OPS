import { NextRequest, NextResponse } from "next/server";
import { joinStudent } from "@/lib/gameService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, roll, pin } = body;

    if (!name || !roll || !pin) {
      return NextResponse.json(
        { error: "Name, roll number, and game PIN are required." },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get("authorization");
    const existingToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : undefined;

    const result = await joinStudent(name, roll, pin, existingToken);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to join game" },
      { status: 400 }
    );
  }
}
