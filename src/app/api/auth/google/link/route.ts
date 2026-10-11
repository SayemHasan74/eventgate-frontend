import { z } from "zod";
import {
  authenticatedFetch,
  checkCsrf,
  currentSession,
} from "@/lib/server/browser-session";
import {
  privateJson,
  sessionFailure,
  upstreamFailure,
} from "@/lib/server/session-response";
import { SessionError } from "@/lib/server/session-store";

export async function POST(request: Request) {
  try {
    const session = await currentSession();
    if (!session) throw new SessionError("AUTHENTICATION_REQUIRED", 401);
    await checkCsrf(request, session);
    const response = await authenticatedFetch(session, "auth/google/link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-request-id":
          request.headers.get("x-request-id") ?? crypto.randomUUID(),
      },
      body: await request.text(),
    });
    const payload = await response.json();
    if (!response.ok) return upstreamFailure(response, payload);
    return privateJson(
      {
        success: true,
        data: z.object({ alreadyLinked: z.boolean() }).parse(payload.data),
      },
      response.status,
    );
  } catch (error) {
    return sessionFailure(error);
  }
}
