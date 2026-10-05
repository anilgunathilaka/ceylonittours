import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { safeCallbackUrl } from "@/lib/auth/redirect";

const AUTH_PAGES = ["/login", "/register"];

export async function proxy(req: NextRequest) {
  const { pathname, search, searchParams } = req.nextUrl;
  const isAuthPage = AUTH_PAGES.includes(pathname);
  const isPackageBooking = pathname === "/contact" && searchParams.has("package");
  const isProtected = isPackageBooking || pathname.startsWith("/profile") || pathname.startsWith("/admin");

  if (!isAuthPage && !isProtected) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:",
  });

  // Signed-in users have no reason to see login/register
  if (isAuthPage) {
    if (!token) return NextResponse.next();
    const target = safeCallbackUrl(searchParams.get("callbackUrl"));
    return NextResponse.redirect(new URL(target, req.nextUrl.origin));
  }

  if (!token) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/contact", "/login", "/register", "/profile/:path*", "/admin/:path*"],
};
