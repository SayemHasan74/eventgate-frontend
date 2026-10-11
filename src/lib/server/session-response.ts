import "server-only";
import { NextResponse } from "next/server";
import { clearBrowserCookies } from "./browser-session";
import { SessionError } from "./session-store";

export const privateJson = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
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
