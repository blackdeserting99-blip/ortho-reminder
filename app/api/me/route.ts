import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    id: "dev-user",
    name: "Developer",
    email: "dev@example.com",
  });
}