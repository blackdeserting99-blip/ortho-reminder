import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    // First, just return request details to verify the handler is being called
    return NextResponse.json({
      debug: "HANDLER CALLED",
      method: req.method,
      contentType: req.headers.get("content-type"),
      contentLength: req.headers.get("content-length"),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error in handler", details: String(error) },
      { status: 500 }
    );
  }
}