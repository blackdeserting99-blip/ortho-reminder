import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const mod = await import("../../reminders/run/route");

  return await mod.POST(request);
}