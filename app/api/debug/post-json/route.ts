import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    await request.json();
    return NextResponse.json({
      ok: true,
      received: true,
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