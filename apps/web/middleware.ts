import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/analyze",
  "/analyses",
  "/reports",
  "/settings",
];

const AUTH_PAGES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get("omniscan_token")?.value;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const isAuthPage = AUTH_PAGES.some(
    (authPath) => pathname === authPath || pathname.startsWith(`${authPath}/`)
  );

  // 1. If accessing a protected route without a token, redirect to /login
  if (isProtected && !token) {
    const redirectUrl = new URL("/login", request.url);
    const destination = `${pathname}${search}`;
    if (destination && destination !== "/dashboard") {
      redirectUrl.searchParams.set("redirect", destination);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // 2. If already authenticated and trying to access /login or /register, redirect to /dashboard
  if (isAuthPage && token) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard",
    "/analyze/:path*",
    "/analyze",
    "/analyses/:path*",
    "/analyses",
    "/reports/:path*",
    "/reports",
    "/settings/:path*",
    "/settings",
    "/login",
    "/register",
  ],
};
