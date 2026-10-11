import { upstream } from "@/lib/server/browser-session";
import {
  privateJson,
  sessionFailure,
  upstreamFailure,
} from "@/lib/server/session-response";

export async function GET() {
  try {
    const response = await upstream("auth/google/config");
    const payload = await response.json();
    if (!response.ok) return upstreamFailure(response, payload);
    if (payload.success !== true || typeof payload.data?.enabled !== "boolean")
      throw new Error("Invalid Google configuration response");
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
