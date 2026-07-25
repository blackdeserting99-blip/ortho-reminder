import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    // Read raw body first
    const rawBody = await req.text();
    const bodyBytes = new TextEncoder().encode(rawBody);
    
    return NextResponse.json({
      deployed: "YES-JAN-26",
      rawBody,
      length: rawBody.length,
      bytes: Array.from(bodyBytes.slice(0, 50)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Handler error", details: String(error) },
      { status: 500 }
    );
  }
}