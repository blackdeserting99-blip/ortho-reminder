import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromCookieValue, SESSION_COOKIE_NAME } from "./app/lib/session";
import { neon } from "@neondatabase/serverless";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/login",
  "/api/register",
  "/api/logout",
  "/api/password-reset",
];

function isPublicPath(pathname: string) {
  if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon") || pathname.startsWith("/logo")) {
    return true;
  }

  return PUBLIC_PATHS.some((publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`));
}

const WHATSAPP_SETUP_PATHS = [
  "/settings/whatsapp",
  "/api/settings",
  "/api/logout",
  "/super-admin",
  "/api/super-admin",
];

function isWhatsappSetupPath(pathname: string) {
  return WHATSAPP_SETUP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAdminPath(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/") ||
    pathname === "/super-admin" ||
    pathname.startsWith("/super-admin/") ||
    pathname === "/api/super-admin" ||
    pathname.startsWith("/api/super-admin/")
  );
}

function getDatabaseUrl() {
  const primary = process.env.DATABASE_URL;
  if (primary && primary !== "undefined" && primary.trim().length > 0) {
    return primary;
  }

  const fallback = process.env.NEON_DATABASE_URL;
  if (fallback && fallback !== "undefined" && fallback.trim().length > 0) {
    return fallback;
  }

  return null;
}

async function isAdminUser(userId: string) {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    return { ok: false as const, status: 503, error: "Database not configured" };
  }

  const sql = neon(connectionString);
  const rows = await sql`
    SELECT role, "isDisabled"
    FROM "User"
    WHERE id = ${userId}
    LIMIT 1
  `;

  const account = rows?.[0] as { role?: string; isDisabled?: boolean } | undefined;
  if (!account) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  if (account.isDisabled) {
    return { ok: false as const, status: 403, error: "Account disabled" };
  }

  if (account.role !== "ADMIN") {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  return { ok: true as const };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = await getSessionFromCookieValue(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  // Not logged in → redirect to login
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAdminPath(pathname)) {
    try {
      const adminCheck = await isAdminUser(session.userId);
      if (!adminCheck.ok) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
        }

        return new NextResponse("Unauthorized", {
          status: adminCheck.status,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }
    } catch {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
      }

      return new NextResponse("Internal Server Error", {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  }

  // Temporarily allow dashboard access even when WhatsApp setup is incomplete.
  // This prevents the onboarding flow from blocking navigation for existing users.
  const hasWhatsapp = request.cookies.get("whatsapp_configured")?.value === "1";
  if (!hasWhatsapp && !isWhatsappSetupPath(pathname) && !pathname.startsWith("/api/")) {
    if (pathname === "/") {
      return NextResponse.next();
    }
    if (pathname === "/patients") {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image|favicon|logo).*)"],
};
