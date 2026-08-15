import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import {
  createMetaEmbeddedSignupState,
  getMetaEmbeddedSignupConfig,
  getMetaEmbeddedSignupStateCookieName,
  getMetaEmbeddedSignupStateMaxAge,
} from "@/app/lib/meta-embedded-signup";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = getMetaEmbeddedSignupConfig();
    if (!config.appId || !config.configId || !config.redirectUri) {
      return NextResponse.json({ error: "Meta Embedded Signup is not configured" }, { status: 503 });
    }

    const state = await createMetaEmbeddedSignupState(user.id);
    const url = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`);
    url.searchParams.set("client_id", config.appId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    url.searchParams.set("config_id", config.configId);
    url.searchParams.set("override_default_response_type", "true");

    const response = NextResponse.json({ url: url.toString() });
    response.cookies.set(getMetaEmbeddedSignupStateCookieName(), state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: getMetaEmbeddedSignupStateMaxAge(),
      path: "/settings/whatsapp/meta/callback",
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start Meta Embedded Signup" },
      { status: 500 }
    );
  }
}