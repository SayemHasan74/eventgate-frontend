import { upstream } from "@/lib/server/browser-session";
import { privateJson, sessionFailure } from "@/lib/server/session-response";

export async function GET() {
  try {
    const response = await upstream("auth/google/config");
    const payload = await response.json();
    return privateJson({
      success: true,
      data: {
        enabled: Boolean(payload.data?.enabled),
        clientId: payload.data?.enabled ? payload.data.clientId : undefined,
      },
    });
  } catch (error) {
    return sessionFailure(error);
  }
}
