import { NextResponse } from "next/server";

export async function POST() {
  try {
    await import("../../reminders/run/route");
    return NextResponse.json({
      ok: true,
      loaded: true,
    });
  } catch (error) {
    const caughtError = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json(
      {
        ok: false,
        errorName: caughtError.name,
        errorMessage: caughtError.message,
      },
      { status: 500 }
    );
  }
}