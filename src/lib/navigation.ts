import type { AuthUser } from "./auth-types";
export const workspacePath = (role: AuthUser["role"]) =>
  role === "ADMIN"
    ? "/admin"
    : role === "ORGANIZER"
      ? "/organizer"
      : "/account";
export function backDestination(
  previous: unknown,
  current: string,
  fallback: "/orders" | "/tickets",
) {
  if (
    typeof previous !== "string" ||
    !previous.startsWith("/") ||
    previous.startsWith("//") ||
    /[\\\u0000-\u001f]/.test(previous)
  )
    return fallback;
  const url = new URL(previous, "https://eventgate.invalid");
  const path = url.pathname;
  if (
    url.origin !== "https://eventgate.invalid" ||
    path === "/" ||
    /^\/(auth|payment)(\/|$)/.test(path) ||
    path === new URL(current, url.origin).pathname
  )
    return fallback;
  return path + url.search + url.hash;
}
