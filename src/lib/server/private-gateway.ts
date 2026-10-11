import "server-only";
import {
  authenticatedFetch,
  checkCsrf,
  currentSession,
} from "./browser-session";
import { sessionFailure, privateJson } from "./session-response";
import { SessionError } from "./session-store";
import { isPrivateRouteAllowed } from "./private-routes";
import { safeMessage, safeRetryAfter } from "../api-error";
import { checkoutSchema } from "../api-schemas";
export async function forwardPrivate(request: Request, path: string) {
  const received = request.headers.get("x-request-id");
  const requestId =
    received && /^[A-Za-z0-9_-]{8,128}$/.test(received)
      ? received
      : crypto.randomUUID();
  try {
    if (!isPrivateRouteAllowed(request.method, path))
      throw new SessionError("NOT_FOUND", 404);
    const session = await currentSession();
    if (!session) throw new SessionError("AUTHENTICATION_REQUIRED", 401);
    const hasBody = !["GET", "HEAD"].includes(request.method);
    if (hasBody) await checkCsrf(request, session);
    const headers = new Headers({ "x-request-id": requestId });
    for (const name of ["Content-Type", "Idempotency-Key"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const response = await authenticatedFetch(
      session,
      path + new URL(request.url).search,
      {
        method: request.method,
        headers,
        ...(hasBody ? { body: await request.text() } : {}),
      },
    );
    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload.success !== "boolean")
      throw new SessionError("INVALID_API_RESPONSE", 502);
    // Only expose a redacted diagnostic string, including persisted provider failure messages.
    const redactFailures = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(redactFailures);
      if (value && typeof value === "object")
        return Object.fromEntries(
          Object.entries(value).map(([key, item]) => [
            key,
            key === "failureMessage" && typeof item === "string"
              ? safeMessage(item)
              : redactFailures(item),
          ]),
        );
      return value;
    };
    if (payload.data) payload.data = redactFailures(payload.data);
    // Gateway error messages are data, not trusted diagnostic text; do not relay provider secrets.
    if (!response.ok) {
      payload.message = safeMessage(
        typeof payload.message === "string"
          ? payload.message
          : "Request failed.",
      );
      payload.errors = Array.isArray(payload.errors)
        ? payload.errors.map(
            (error: { field?: string; code?: string; message?: string }) => ({
              field: error.field,
              code: error.code ?? "REQUEST_FAILED",
              message: safeMessage(error.message ?? payload.message),
            }),
          )
        : [];
    } else if (/^payments\/orders\/[^/]+\/checkout$/.test(path)) {
      const parsed = checkoutSchema.safeParse(payload.data);
      if (!parsed.success)
        throw new SessionError("INVALID_CHECKOUT_RESPONSE", 502);
      payload.data = parsed.data;
    }
    const result = privateJson(payload, response.status);
    result.headers.set(
      "x-request-id",
      response.headers.get("x-request-id") ?? requestId,
    );
    const retry = safeRetryAfter(response.headers.get("retry-after"));
    if (response.status === 429 && retry)
      result.headers.set("retry-after", retry);
    return result;
  } catch (error) {
    const result = await sessionFailure(error);
    result.headers.set("x-request-id", requestId);
    return result;
  }
}
