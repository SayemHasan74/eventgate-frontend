import { NextResponse } from "next/server";

import { appConfig } from "@/lib/env";

type RouteParams = RouteContext<"/api/payments/[...path]">;

export async function POST(request: Request, context: RouteParams) {
  const { path } = await context.params;
  const authorization = request.headers.get("Authorization");
  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!authorization) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  if (!idempotencyKey) return NextResponse.json({ message: "Idempotency-Key is required." }, { status: 400 });
  try {
    const upstream = await fetch(`${appConfig.apiBaseUrl}/payments/${path.join("/")}`, {
      method: "POST",
      headers: { Authorization: authorization, "Idempotency-Key": idempotencyKey },
      cache: "no-store",
    });
    return new Response(await upstream.text(), { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" } });
  } catch {
    return NextResponse.json({ message: "Payment service is unavailable." }, { status: 503 });
  }
}
