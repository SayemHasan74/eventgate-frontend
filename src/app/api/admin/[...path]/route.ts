import { NextResponse } from "next/server";

import { appConfig } from "@/lib/env";

type RouteParams = RouteContext<"/api/admin/[...path]">;

export async function GET(request: Request, context: RouteParams) {
  const { path } = await context.params;
  const authorization = request.headers.get("Authorization");
  if (!authorization) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  try {
    const url = new URL(`${appConfig.apiBaseUrl}/admin/${path.join("/")}`);
    url.search = new URL(request.url).search;
    const upstream = await fetch(url, { headers: { Authorization: authorization }, cache: "no-store" });
    return new Response(await upstream.text(), { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" } });
  } catch {
    return NextResponse.json({ message: "Admin reporting service is unavailable." }, { status: 503 });
  }
}
