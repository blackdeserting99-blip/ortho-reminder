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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    if (pathname === "/login" || pathname === "/register") {
      const session = await getSessionFromCookieValue(request.cookies.get(SESSION_COOKIE_NAME)?.value);
      if (session) {
        return NextResponse.redirect(new URL("/patients", request.url));
      }
    }

    return NextResponse.next();
  }

  const session = await getSessionFromCookieValue(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/health).*)"],
};
