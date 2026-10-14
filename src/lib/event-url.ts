import "server-only";

export function eventUrl(slug: string, isDemo = false) {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://eventgate-frontend-lovat.vercel.app";
  return new URL(`${isDemo ? "/demo/events" : "/events"}/${encodeURIComponent(slug)}`, origin).toString();
}
