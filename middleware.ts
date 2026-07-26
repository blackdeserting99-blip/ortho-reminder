import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromCookieValue, SESSION_COOKIE_NAME } from "./app/lib/session";

const PUBLIC_PATHS = ["/login", "/register", "/api/login", "/api/register", "/api/logout"];

function isPublicPath(pathname: string) {
  if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon") || pathname.startsWith("/logo")) {
    return true;
  }

  return PUBLIC_PATHS.some((publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`));
}

const WHATSAPP_SETUP_PATHS = ["/settings/whatsapp", "/api/settings", "/api/logout"];

function isWhatsappSetupPath(pathname: string) {
  return WHATSAPP_SETUP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
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

  // Check whatsapp_configured cookie set after saving number
  const hasWhatsapp = request.cookies.get("whatsapp_configured")?.value === "1";

  // Logged in but no WhatsApp number set → redirect to setup (except setup paths themselves)
  if (!hasWhatsapp && !isWhatsappSetupPath(pathname) && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/settings/whatsapp", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image|favicon|logo).*)"],
};
