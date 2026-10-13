import { NextResponse, type NextRequest } from "next/server";

// Navigation hint only. Protected layouts and the API validate the Redis session.
export function proxy(request: NextRequest) {
  const name =
    process.env.NODE_ENV === "production"
      ? "__Host-eventgate.sid"
      : "eventgate.sid";
  if (request.cookies.has(name)) {
    const headers = new Headers(request.headers);
    headers.set(
      "x-eventgate-next",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.next({ request: { headers } });
  }
  const url = new URL("/auth/sign-in", request.url);
  url.searchParams.set(
    "next",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.redirect(url);
}
export const config = {
  matcher: [
    "/notifications/:path*",
    "/account/:path*",
    "/tickets/:path*",
    "/orders/:path*",
    "/refunds/:path*",
    "/organizer/:path*",
    "/admin/:path*",
  ],
};
