import { authUserSchema, type AuthSession } from "@/lib/auth-types";
import { resetCsrf, sessionFetch } from "./session-fetch";

export class AuthApiError extends Error {
  constructor(
    message: string,
    public sessionEnded = false,
  ) {
    super(message);
  }
}
async function requestSession(
  action: string,
  body: unknown,
): Promise<AuthSession> {
  const response = await sessionFetch("/api/auth/" + action, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success)
    throw new AuthApiError(
      payload.errors?.[0]?.message ??
        payload.message ??
        "Sign-in could not be completed.",
    );
  resetCsrf();
  return { user: authUserSchema.parse(payload.data.user) };
}
export const signIn = (input: { email: string; password: string }) =>
  requestSession("login", input);
export const register = (input: {
  email: string;
  password: string;
  displayName: string;
}) => requestSession("register", input);
export const signInWithGoogle = (idToken: string) =>
  requestSession("google", { idToken });
export async function signOut() {
  let response: Response;
  try {
    response = await sessionFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Even when CSRF bootstrap infrastructure is down, the same-origin logout
    // handler clears the cookie and reports that server revocation is unavailable.
    response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  }
  resetCsrf();
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new AuthApiError(
      payload.message ?? "Sign-out could not be confirmed. Please retry.",
      payload.data?.sessionEnded === true,
    );
  }
}
export async function linkGoogle(idToken: string) {
  const response = await sessionFetch("/api/auth/google/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const payload = await response.json();
  if (!response.ok)
    throw new AuthApiError(payload.message ?? "Google linking failed.");
  return payload.data as { alreadyLinked: boolean };
}
