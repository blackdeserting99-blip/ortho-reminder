import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  return NextResponse.json({
    error: "FORCED TEST - CHECK IF THIS DEPLOYS AT ALL",
    timestamp: new Date().toISOString(),
  });
}