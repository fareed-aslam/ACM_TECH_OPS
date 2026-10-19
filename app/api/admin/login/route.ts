import { NextRequest, NextResponse } from "next/server";
import { createAdminToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const token = createAdminToken(password);
    if (!token) {
      return NextResponse.json({ error: "Incorrect admin password" }, { status: 401 });
    }

    return NextResponse.json({ token, expiresIn: "12h" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Login failed" },
      { status: 500 }
    );
  }
}
