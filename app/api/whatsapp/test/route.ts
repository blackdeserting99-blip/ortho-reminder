import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { error: "This legacy credential test endpoint is disabled. Use Embedded Signup and the connected-account test instead." },
    { status: 410 }
  );
}