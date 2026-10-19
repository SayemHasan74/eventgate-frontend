import { checkCsrf, currentSession } from "@/lib/server/browser-session";
import { upstream } from "@/lib/server/upstream";
import {
  privateJson,
  sessionFailure,
  upstreamFailure,
} from "@/lib/server/session-response";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function GET(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (action !== "config")
    return privateJson({ success: false, message: "Not found" }, 404);
  try {
    const response = await upstream(
      "ai/config" + new URL(request.url).search,
      {},
      true,
    );
    const payload = await response.json();
    return response.ok
      ? privateJson(payload)
      : upstreamFailure(response, payload);
  } catch (error) {
    return sessionFailure(error);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (!["search", "ask"].includes(action))
    return privateJson({ success: false, message: "Not found" }, 404);
  try {
    await checkCsrf(request, await currentSession());
    const body = await request.text();
    if (body.length > 4000)
      return privateJson(
        { success: false, message: "Please shorten your question." },
        413,
      );
    const response = await upstream(
      "ai/" + action + new URL(request.url).search,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      },
      true,
    );
    const payload = await response.json();
    return response.ok
      ? privateJson(payload)
      : upstreamFailure(response, payload);
  } catch (error) {
    return sessionFailure(error);
  }
}
