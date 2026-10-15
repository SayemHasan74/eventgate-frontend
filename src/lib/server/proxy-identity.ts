import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";

export async function proxyIdentityHeaders(method: string, url: string) {
  const result = new Headers();
  const secret = process.env.BFF_PROXY_SECRET;
  if (!secret || process.env.VERCEL !== "1") return result;
  // Vercel overwrites this edge-provided header; never trust a caller's arbitrary identity header.
  const incoming = await headers();
  const ip = incoming.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (!ip || !isIP(ip)) return result;
  const timestamp = String(Date.now());
  const target = new URL(url);
  result.set("x-eventgate-client-ip", ip);
  result.set("x-eventgate-proxy-time", timestamp);
  result.set(
    "x-eventgate-proxy-signature",
    createHmac("sha256", secret)
      .update(
        `${timestamp}\n${method.toUpperCase()}\n${target.pathname}${target.search}\n${ip}`,
      )
      .digest("hex"),
  );
  return result;
}
