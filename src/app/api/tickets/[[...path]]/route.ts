import { NextResponse } from "next/server";

import { appConfig } from "@/lib/env";

type RouteParams = { params: Promise<{ path?: string[] }> };

export async function GET(request: Request, context: RouteParams) {
  const { path = [] } = await context.params;
  const authorization = request.headers.get("Authorization");
  if (!authorization) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });

  try {
    const suffix = path.length > 0 ? `/${path.join("/")}` : "";
    const upstream = await fetch(`${appConfig.apiBaseUrl}/tickets${suffix}`, {
      headers: { Authorization: authorization },
      cache: "no-store",
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "Ticket service is unavailable." }, { status: 503 });
  }
}
