import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("session_token")?.value;

  // Static files or Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Root redirects to /hosted-zones (or /login if not authenticated)
  if (pathname === "/") {
    if (sessionToken) {
      return NextResponse.redirect(new URL("/hosted-zones", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Login page access: redirect to /hosted-zones if already logged in
  if (pathname === "/login") {
    if (sessionToken) {
      return NextResponse.redirect(new URL("/hosted-zones", request.url));
    }
    return NextResponse.next();
  }

  // Protected application routes: redirect to /login if no cookie
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
