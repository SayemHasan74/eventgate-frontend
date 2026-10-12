import "server-only";

export function eventUrl(slug: string) {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://eventgate-frontend-lovat.vercel.app";
  return new URL(`/events/${encodeURIComponent(slug)}`, origin).toString();
}
