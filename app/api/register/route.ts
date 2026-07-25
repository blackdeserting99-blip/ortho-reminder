import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    // Minimal test to verify this code deploys
    const contentLength = req.headers.get("content-length");
    const body = await req.json();
    
    return NextResponse.json({
      deployed: "YES-JAN-26-MINIMAL",
      received: {
        name: body.name,
        email: body.email,
        contentLength,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Minimal handler error", details: String(error) },
      { status: 500 }
    );
  }
}