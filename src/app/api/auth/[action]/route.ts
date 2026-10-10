import { NextResponse } from "next/server";

import { appConfig } from "@/lib/env";

const supportedActions = new Set(["login", "register", "logout"]);

export async function POST(request: Request, context: RouteContext<"/api/auth/[action]">) {
  const { action } = await context.params;
  if (!supportedActions.has(action)) return NextResponse.json({ message: "Not found" }, { status: 404 });

  try {
    const body = await request.text();
    const upstream = await fetch(`${appConfig.apiBaseUrl}/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    const responseBody = await upstream.text();
    return new Response(responseBody, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "EventGate authentication service is unavailable." }, { status: 503 });
  }
}
