import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appId = (process.env.META_APP_ID || "").trim();
  const configId = (process.env.META_EMBEDDED_SIGNUP_CONFIG_ID || "").trim();
  const graphVersion = (process.env.META_GRAPH_API_VERSION || "v23.0").trim();
  const redirectUri = (process.env.META_EMBEDDED_SIGNUP_REDIRECT_URI || "").trim();

  if (!appId || !configId) {
    return NextResponse.json(
      {
        error:
          "Meta Embedded Signup is not configured. Missing META_APP_ID or META_EMBEDDED_SIGNUP_CONFIG_ID.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    appId,
    configId,
    graphVersion,
    redirectUri: redirectUri || null,
  });
}
