import {
  authenticatedFetch,
  checkCsrf,
  currentSession,
} from "@/lib/server/browser-session";
import { privateJson, sessionFailure } from "@/lib/server/session-response";
import { SessionError } from "@/lib/server/session-store";

export async function POST(request: Request) {
  try {
    const session = await currentSession();
    if (!session) throw new SessionError("AUTHENTICATION_REQUIRED", 401);
    await checkCsrf(request, session);
    const response = await authenticatedFetch(session, "auth/google/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    });
    const payload = await response.json();
    return privateJson(
      response.ok
        ? {
            success: true,
            data: { alreadyLinked: Boolean(payload.data?.alreadyLinked) },
          }
        : { success: false, message: payload.message, errors: payload.errors },
      response.status,
    );
  } catch (error) {
    return sessionFailure(error);
  }
}
