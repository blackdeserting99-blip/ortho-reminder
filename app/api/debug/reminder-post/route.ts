import { NextResponse } from "next/server";

export async function GET() {
  try {
    const mod = await import("@/app/api/reminders/run/route");
    const request = new Request("https://diagnostic.local/api/reminders/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-reminder-auth": "diagnostic",
      },
      body: JSON.stringify({
        patientId: 112,
        limit: 1,
        dryRun: true,
        baseDate: "2026-09-17",
        reminderType: "3days",
      }),
    });
    const response = await mod.POST(request);

    return NextResponse.json({
      ok: true,
      status: response.status,
      body: await response.text(),
    });
  } catch (error) {
    const caughtError = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json(
      {
        ok: false,
        errorName: caughtError.name,
        errorMessage: caughtError.message,
        stack: caughtError.stack,
      },
      { status: 500 }
    );
  }
}