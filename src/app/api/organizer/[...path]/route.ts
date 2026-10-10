import { NextResponse } from "next/server";

import { appConfig } from "@/lib/env";

type RouteParams = RouteContext<"/api/organizer/[...path]">;

async function forward(request: Request, context: RouteParams) {
  const { path } = await context.params;
  const authorization = request.headers.get("Authorization");
  if (!authorization) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  try {
    const upstream = await fetch(`${appConfig.apiBaseUrl}/organizer/${path.join("/")}`, {
      method: request.method,
      headers: { Authorization: authorization, ...(request.headers.get("Content-Type") ? { "Content-Type": request.headers.get("Content-Type")! } : {}) },
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store",
    });
    return new Response(await upstream.text(), { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" } });
  } catch {
    return NextResponse.json({ message: "Organizer service is unavailable." }, { status: 503 });
  }
}

export const GET = forward;
export const POST = forward;
