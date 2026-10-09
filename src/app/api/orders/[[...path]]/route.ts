import { NextResponse } from "next/server";

import { appConfig } from "@/lib/env";

type RouteParams = RouteContext<"/api/orders/[[...path]]">;

async function forward(request: Request, context: RouteParams) {
  const { path = [] } = await context.params;
  const authorization = request.headers.get("Authorization");
  if (!authorization) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });

  try {
    const headers = new Headers({ Authorization: authorization });
    const contentType = request.headers.get("Content-Type");
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (contentType) headers.set("Content-Type", contentType);
    if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
    const upstream = await fetch(`${appConfig.apiBaseUrl}/orders/${path.join("/")}`, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store",
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "EventGate orders service is unavailable." }, { status: 503 });
  }
}

export const GET = forward;
export const POST = forward;
