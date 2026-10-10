import type { AuthSession } from "@/components/auth-provider";

type ApiSuccess<T> = { success: true; message: string; data: T };
type ApiError = { success?: false; message?: string; errors?: Array<{ message?: string }> };

type SignInInput = { email: string; password: string };
type RegisterInput = SignInInput & { displayName: string };
type DemoRole = "ATTENDEE" | "ORGANIZER" | "ADMIN";

export class AuthApiError extends Error {}

async function requestSession(
  path: "/auth/login" | "/auth/register" | "/auth/google" | "/auth/demo",
  body: SignInInput | RegisterInput | { idToken: string } | { role: DemoRole },
) {
  const response = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as ApiSuccess<AuthSession> | ApiError;

  if (!response.ok || !payload.success || !payload.data) {
    const error = payload as ApiError;
    throw new AuthApiError(error.errors?.[0]?.message ?? error.message ?? "Something went wrong. Please try again.");
  }
  return payload.data;
}

export const signIn = (input: SignInInput) => requestSession("/auth/login", input);
export const register = (input: RegisterInput) => requestSession("/auth/register", input);
export const signInWithGoogle = (idToken: string) => requestSession("/auth/google", { idToken });
export const signInDemo = (role: DemoRole) => requestSession("/auth/demo", { role });

export async function signOut(refreshToken: string) {
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
}
