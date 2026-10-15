import "server-only";
import { proxyIdentityHeaders } from "./proxy-identity";
import { appConfig } from "../env";
import { SessionError } from "./session-store";
export async function upstream(
  path: string,
  init: RequestInit = {},
  publicRead = false,
) {
  const base =
    process.env.API_BASE_URL ?? (publicRead ? appConfig.apiBaseUrl : undefined);
  if (!base) throw new SessionError("SESSION_CONFIGURATION_ERROR");
  if (
    !/^[a-z][a-z0-9-]*(\/[a-zA-Z0-9_-]+)*(\?[^#]*)?$/.test(path) ||
    path.split("?")[0].includes("..")
  )
    throw new SessionError("NOT_FOUND", 404);
  try {
    const url = base.replace(/\/$/, "") + "/" + path;
    const headers = new Headers(init.headers);
    for (const name of [
      "x-eventgate-client-ip",
      "x-eventgate-proxy-time",
      "x-eventgate-proxy-signature",
    ])
      headers.delete(name);
    (await proxyIdentityHeaders(init.method ?? "GET", url)).forEach(
      (value, key) => headers.set(key, value),
    );
    return await fetch(url, {
      ...init,
      headers,
      ...(publicRead ? {} : { cache: "no-store" as const }),
      redirect: "error",
      signal: AbortSignal.timeout(
        /^payments\/orders\/[^/]+\/checkout$/.test(path.split("?")[0])
          ? 25000
          : 15000,
      ),
    });
  } catch (error) {
    throw new SessionError(
      error instanceof Error &&
        ["TimeoutError", "AbortError"].includes(error.name)
        ? "API_TIMEOUT"
        : "API_UNAVAILABLE",
    );
  }
}
