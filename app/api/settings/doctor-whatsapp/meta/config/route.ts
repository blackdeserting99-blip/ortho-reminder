import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { getMetaEmbeddedSignupConfig } from "@/app/lib/meta-embedded-signup";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appId, configId, graphVersion, redirectUri } = getMetaEmbeddedSignupConfig();

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
