import "server-only";
import {
  authenticatedFetch,
  checkCsrf,
  currentSession,
} from "./browser-session";
import { sessionFailure } from "./session-response";
import { SessionError } from "./session-store";

export async function forwardPrivate(request: Request, path: string) {
  try {
    const session = await currentSession();
    if (!session) throw new SessionError("AUTHENTICATION_REQUIRED", 401);
    if (
      !/^(orders|users|tickets|organizer|admin|payments|refund-requests)(\/[-a-zA-Z0-9]+)*$/.test(
        path,
      )
    )
      throw new SessionError("NOT_FOUND", 404);
    const hasBody = !["GET", "HEAD"].includes(request.method);
    if (hasBody) await checkCsrf(request, session);
    const headers = new Headers();
    for (const name of ["Content-Type", "Idempotency-Key", "X-Request-Id"]) {
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
    const resultHeaders = new Headers({
      "Content-Type":
        response.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "private, no-store",
    });
    for (const name of ["Retry-After", "X-Request-Id"]) {
      const value = response.headers.get(name);
      if (value) resultHeaders.set(name, value);
    }
    return new Response(await response.text(), {
      status: response.status,
      headers: resultHeaders,
    });
  } catch (error) {
    return sessionFailure(error);
  }
}
