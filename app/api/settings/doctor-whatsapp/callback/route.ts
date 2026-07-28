import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { encryptWhatsAppAccessToken } from "@/app/lib/whatsapp";

type CallbackPayload = {
  code?: string;
  businessAccountId?: string;
  phoneNumberId?: string;
};

type MetaRequestResult = {
  ok: boolean;
  payload: any;
  error?: string;
};

function readEnv(name: string) {
  const value = (process.env[name] || "").trim();
  return value || null;
}

function sanitize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function fetchMetaJson(url: string): Promise<MetaRequestResult> {
  try {
    const response = await fetch(url, { method: "GET" });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        payload,
        error: payload?.error?.message || `Meta request failed: ${response.status}`,
      };
    }

    return { ok: true, payload };
  } catch (error) {
    return {
      ok: false,
      payload: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function exchangeCodeForToken(input: {
  appId: string;
  appSecret: string;
  callbackUrl: string;
  code: string;
  apiVersion: string;
}) {
  const url = new URL(`https://graph.facebook.com/${input.apiVersion}/oauth/access_token`);
  url.searchParams.set("client_id", input.appId);
  url.searchParams.set("client_secret", input.appSecret);
  url.searchParams.set("redirect_uri", input.callbackUrl);
  url.searchParams.set("code", input.code);

  const exchanged = await fetchMetaJson(url.toString());
  if (!exchanged.ok) {
    return { token: "", error: exchanged.error || "Token exchange failed" };
  }

  const shortLivedToken = sanitize(exchanged.payload?.access_token);
  if (!shortLivedToken) {
    return { token: "", error: "Meta token exchange did not return access token" };
  }

  const longUrl = new URL(`https://graph.facebook.com/${input.apiVersion}/oauth/access_token`);
  longUrl.searchParams.set("grant_type", "fb_exchange_token");
  longUrl.searchParams.set("client_id", input.appId);
  longUrl.searchParams.set("client_secret", input.appSecret);
  longUrl.searchParams.set("fb_exchange_token", shortLivedToken);

  const longLived = await fetchMetaJson(longUrl.toString());
  if (longLived.ok) {
    const token = sanitize(longLived.payload?.access_token);
    if (token) {
      return { token, error: "" };
    }
  }

  return { token: shortLivedToken, error: "" };
}

async function resolveWhatsAppIds(input: {
  apiVersion: string;
  accessToken: string;
  providedBusinessAccountId?: string;
  providedPhoneNumberId?: string;
}) {
  let businessAccountId = sanitize(input.providedBusinessAccountId);
  let phoneNumberId = sanitize(input.providedPhoneNumberId);

  if (businessAccountId && phoneNumberId) {
    return { businessAccountId, phoneNumberId, error: "" };
  }

  const meUrl = new URL(`https://graph.facebook.com/${input.apiVersion}/me`);
  meUrl.searchParams.set(
    "fields",
    "businesses{id,name,owned_whatsapp_business_accounts{id,phone_numbers{id,display_phone_number}}}"
  );
  meUrl.searchParams.set("access_token", input.accessToken);

  const meResponse = await fetchMetaJson(meUrl.toString());
  if (!meResponse.ok) {
    return {
      businessAccountId,
      phoneNumberId,
      error: meResponse.error || "Failed to fetch businesses from Meta",
    };
  }

  const businesses = Array.isArray(meResponse.payload?.businesses?.data)
    ? meResponse.payload.businesses.data
    : [];

  for (const business of businesses) {
    const wabas = Array.isArray(business?.owned_whatsapp_business_accounts?.data)
      ? business.owned_whatsapp_business_accounts.data
      : [];

    for (const waba of wabas) {
      if (!businessAccountId) {
        businessAccountId = sanitize(waba?.id);
      }

      const phoneNumbers = Array.isArray(waba?.phone_numbers?.data)
        ? waba.phone_numbers.data
        : [];

      if (!phoneNumberId && phoneNumbers.length > 0) {
        phoneNumberId = sanitize(phoneNumbers[0]?.id);
      }

      if (businessAccountId && phoneNumberId) {
        return { businessAccountId, phoneNumberId, error: "" };
      }
    }
  }

  return {
    businessAccountId,
    phoneNumberId,
    error: "Unable to resolve WhatsApp Business account or phone number ID from Meta response",
  };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CallbackPayload | null;
  const code = sanitize(body?.code);
  const providedBusinessAccountId = sanitize(body?.businessAccountId);
  const providedPhoneNumberId = sanitize(body?.phoneNumberId);

  if (!code) {
    return NextResponse.json({ error: "Missing OAuth code" }, { status: 400 });
  }

  const appId = readEnv("META_APP_ID");
  const appSecret = readEnv("META_APP_SECRET");
  const callbackUrl = readEnv("CALLBACK_URL");
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

  if (!appId || !appSecret || !callbackUrl) {
    return NextResponse.json(
      {
        error:
          "Missing Meta configuration. Ensure META_APP_ID, META_APP_SECRET, and CALLBACK_URL are set.",
      },
      { status: 500 }
    );
  }

  const exchanged = await exchangeCodeForToken({
    appId,
    appSecret,
    callbackUrl,
    code,
    apiVersion,
  });

  if (!exchanged.token) {
    return NextResponse.json(
      { error: exchanged.error || "Failed to exchange OAuth code for access token" },
      { status: 502 }
    );
  }

  const resolvedIds = await resolveWhatsAppIds({
    apiVersion,
    accessToken: exchanged.token,
    providedBusinessAccountId,
    providedPhoneNumberId,
  });

  if (!resolvedIds.businessAccountId || !resolvedIds.phoneNumberId) {
    return NextResponse.json(
      {
        error:
          resolvedIds.error ||
          "Could not find WhatsApp Business Account ID and Phone Number ID.",
      },
      { status: 502 }
    );
  }

  const encryptedToken = await encryptWhatsAppAccessToken(exchanged.token);
  const { prisma } = await import("@/app/lib/prisma");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      whatsappBusinessAccountId: resolvedIds.businessAccountId,
      whatsappPhoneNumberId: resolvedIds.phoneNumberId,
      whatsappAccessToken: encryptedToken,
      whatsappConnectedAt: new Date(),
    },
  });

  const response = NextResponse.json({
    ok: true,
    connected: true,
    connectedAt: new Date().toISOString(),
    businessAccountId: resolvedIds.businessAccountId,
    phoneNumberId: resolvedIds.phoneNumberId,
  });

  response.cookies.set("whatsapp_configured", "1", {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
