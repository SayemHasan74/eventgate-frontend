import {
  backendAuthSchema,
  checkCsrf,
  clearBrowserCookies,
  csrfBootstrap,
  currentSession,
  ensureSessionInfrastructure,
  establishSession,
  logoutSession,
  refreshSession,
  sessionIdentity,
  upstream,
} from "@/lib/server/browser-session";
import {
  privateJson,
  sessionFailure,
  upstreamFailure,
} from "@/lib/server/session-response";
import { SessionError } from "@/lib/server/session-store";

export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: RouteContext<"/api/auth/[action]">,
) {
  const { action } = await context.params;
  try {
    if (action === "csrf")
      return privateJson({
        success: true,
        data: { csrf: await csrfBootstrap() },
      });
    if (action === "session") {
      const session = await currentSession();
      if (!session) {
        await clearBrowserCookies(false);
        return privateJson({
          success: true,
          data: { state: "anonymous", session: null },
        });
      }
      return privateJson({
        success: true,
        data: {
          state: "authenticated",
          session: { user: await sessionIdentity(session) },
        },
      });
    }
    return privateJson({ success: false, message: "Not found" }, 404);
  } catch (error) {
    return sessionFailure(error);
  }
}
export async function POST(
  request: Request,
  context: RouteContext<"/api/auth/[action]">,
) {
  const { action } = await context.params;
  if (!["login", "register", "google", "refresh", "logout"].includes(action))
    return privateJson({ success: false, message: "Not found" }, 404);
  try {
    const session = await currentSession();
    await checkCsrf(request, session);
    if (action === "logout") {
      try {
        if (session) await logoutSession(session);
      } finally {
        await clearBrowserCookies();
      }
      return privateJson({ success: true, data: null });
    }
    if (action === "refresh") {
      if (!session) throw new SessionError("AUTHENTICATION_REQUIRED", 401);
      const refreshed = await refreshSession(session, true);
      return privateJson({
        success: true,
        data: { user: await sessionIdentity(refreshed) },
      });
    }
    await ensureSessionInfrastructure();
    const response = await upstream("auth/" + action, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-request-id":
          request.headers.get("x-request-id") ?? crypto.randomUUID(),
      },
      body: await request.text(),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success)
      return upstreamFailure(response, payload);
    return privateJson(
      {
        success: true,
        data: await establishSession(backendAuthSchema.parse(payload.data)),
      },
      response.status,
    );
  } catch (error) {
    if (
      action === "logout" &&
      request.headers.get("origin") === new URL(request.url).origin &&
      !(error instanceof SessionError && error.status === 403)
    ) {
      await clearBrowserCookies();
      return privateJson(
        {
          success: false,
          message:
            "Browser session cleared; server revocation could not be confirmed.",
          data: { sessionEnded: true },
          errors: [{ code: "LOGOUT_REVOCATION_UNAVAILABLE" }],
        },
        503,
      );
    }
    return sessionFailure(error);
  }
}
