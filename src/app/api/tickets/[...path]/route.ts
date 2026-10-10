import { NextResponse } from "next/server";

import { appConfig } from "@/lib/env";

type RouteParams = RouteContext<"/api/tickets/[...path]">;

export async function GET(request: Request, context: RouteParams) {
  const { path } = await context.params;
  const authorization = request.headers.get("Authorization");
  if (!authorization) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  try {
    const upstream = await fetch(`${appConfig.apiBaseUrl}/tickets/${path.join("/")}`, { headers: { Authorization: authorization }, cache: "no-store" });
    return new Response(await upstream.text(), { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" } });
  } catch {
    return NextResponse.json({ message: "Ticket service is unavailable." }, { status: 503 });
  }
}
