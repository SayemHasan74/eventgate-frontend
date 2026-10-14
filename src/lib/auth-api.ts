import { z } from "zod";
import { authUserSchema, type AuthSession } from "./auth-types";
import { apiClient, jsonBody } from "./api-client";
import { resetCsrf } from "./session-fetch";
export { ApiError as AuthApiError } from "./api-error";
async function requestSession(
  action: string,
  body: unknown,
): Promise<AuthSession> {
  const result = await apiClient(
    "/api/auth/" + action,
    z.object({ user: authUserSchema }),
    { method: "POST", ...jsonBody(body) },
  );
  resetCsrf();
  return result;
}
export const signIn = (input: { email: string; password: string }) =>
  requestSession("login", input);
export const signInDemo = (role: "ATTENDEE" | "ORGANIZER") =>
  requestSession("demo", { role });
export const register = (input: {
  email: string;
  password: string;
  displayName: string;
}) => requestSession("register", input);
export const signInWithGoogle = (idToken: string) =>
  requestSession("google", { idToken });
export async function signOut() {
  try {
    await apiClient("/api/auth/logout", z.null(), { method: "POST" });
  } finally {
    resetCsrf();
  }
}
export const linkGoogle = (idToken: string) =>
  apiClient("/api/auth/google/link", z.object({ alreadyLinked: z.boolean() }), {
    method: "POST",
    ...jsonBody({ idToken }),
  });
