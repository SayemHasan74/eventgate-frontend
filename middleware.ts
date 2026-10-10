import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/account", "/tickets", "/orders", "/refunds", "/organizer", "/admin"];

export function middleware(request: NextRequest) {
  if (!protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) return NextResponse.next();
  if (request.cookies.get("eventgate_session")?.value === "1") return NextResponse.next();
  const url = new URL("/auth/sign-in", request.url);
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/account/:path*", "/tickets/:path*", "/orders/:path*", "/refunds/:path*", "/organizer/:path*", "/admin/:path*"] };
