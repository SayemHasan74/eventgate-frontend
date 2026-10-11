import "server-only";
import { responseError, safeRetryAfter } from "../api-error";
import { NextResponse } from "next/server";
import { clearBrowserCookies } from "./browser-session";
import { SessionError } from "./session-store";

export const privateJson = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "x-request-id": crypto.randomUUID(),
    },
  });
export async function sessionFailure(error: unknown) {
  const failure =
    error instanceof SessionError
      ? error
      : new SessionError("SESSION_UNAVAILABLE");
  if (failure.status === 401) await clearBrowserCookies();
  return privateJson(
    {
      success: false,
      message: failure.message,
      errors: [{ code: failure.code, message: failure.message }],
    },
    failure.status,
  );
}

export function upstreamFailure(response: Response, payload: unknown) {
  const error = responseError(response, payload);
  const result = privateJson(
    { success: false, message: error.message, errors: error.errors },
    response.status,
  );
  if (error.requestId) result.headers.set("x-request-id", error.requestId);
  const retry = safeRetryAfter(response.headers.get("retry-after"));
  if (response.status === 429 && retry)
    result.headers.set("retry-after", retry);
  return result;
}
