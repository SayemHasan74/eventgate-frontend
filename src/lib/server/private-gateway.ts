import "server-only";
import { revalidatePath } from "next/cache";
import {
  authenticatedFetch,
  checkCsrf,
  currentSession,
} from "./browser-session";
import { sessionFailure, privateJson } from "./session-response";
import { SessionError } from "./session-store";
import { isPrivateRouteAllowed } from "./private-routes";
import { safeMessage, safeRetryAfter, responseError } from "../api-error";
import { checkoutSchema, qrSchema } from "../api-schemas";
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
    if (!response.ok) {
      const error = responseError(response, payload);
      const result = privateJson(
        { success: false, message: error.message, errors: error.errors },
        response.status,
      );
      result.headers.set("x-request-id", error.requestId ?? requestId);
      const retry = safeRetryAfter(response.headers.get("retry-after"));
      if (response.status === 429 && retry)
        result.headers.set("retry-after", retry);
      return result;
    }
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
    // Validate private media and provider navigation before relaying them to the browser.
    if (/^tickets\/[^/]+\/qr$/.test(path)) {
      const parsed = qrSchema.safeParse(payload.data);
      if (
        !parsed.success ||
        parsed.data.ticketId.toLowerCase() !== path.split("/")[1].toLowerCase()
      )
        throw new SessionError("INVALID_QR_RESPONSE", 502);
      payload.data = parsed.data;
    } else if (/^payments\/orders\/[^/]+\/checkout$/.test(path)) {
      const parsed = checkoutSchema.safeParse(payload.data);
      if (!parsed.success)
        throw new SessionError("INVALID_CHECKOUT_RESPONSE", 502);
      payload.data = parsed.data;
    }
    const result = privateJson(payload, response.status);
    if (
      payload.success &&
      hasBody &&
      /^(organizer\/events|admin\/events|orders|refund-requests|admin\/refunds|payments\/orders)(\/|$)/.test(
        path,
      )
    ) {
      revalidatePath("/(public)/events", "page");
      revalidatePath("/(public)/events/[slug]", "page");
      revalidatePath("/(public)/events/[slug]/tickets", "page");
    }
    result.headers.set(
      "x-request-id",
      response.headers.get("x-request-id") ?? requestId,
    );
    return result;
  } catch (error) {
    const result = await sessionFailure(error);
    result.headers.set("x-request-id", requestId);
    return result;
  }
}
