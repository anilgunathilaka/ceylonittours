import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { safeCallbackUrl } from "@/lib/auth/redirect";

const AUTH_PAGES = ["/login", "/register"];

export async function proxy(req: NextRequest) {
  const { pathname, search, searchParams } = req.nextUrl;
  const isAuthPage = AUTH_PAGES.includes(pathname);
  // Tour pages are public; only the booking step (/contact with a package or a chosen date) needs login
  const isPackageBooking = pathname === "/contact" && (searchParams.has("package") || searchParams.has("date"));
  const isProtected = isPackageBooking || pathname.startsWith("/profile") || pathname.startsWith("/admin");

  if (!isAuthPage && !isProtected) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:",
  });

  // Signed-in users have no reason to see login/register. Only redirect real page visits:
  // redirecting Next's background RSC/prefetch requests (e.g. for the header's "Log in" link)
  // makes Next 16.4+ reject them with a 404. Next strips its own RSC headers before the proxy
  // runs, so use the browser's Sec-Fetch-Dest ("document" for page loads, "empty" for fetches).
  if (isAuthPage) {
    const fetchDest = req.headers.get("sec-fetch-dest");
    const isPageVisit = fetchDest === null || fetchDest === "document";
    if (!token || !isPageVisit) return NextResponse.next();
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
