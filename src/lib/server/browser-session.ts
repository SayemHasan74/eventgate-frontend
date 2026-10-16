import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { upstream } from "./upstream";
import { authUserSchema, type AuthUser } from "@/lib/auth-types";
import {
  csrfForGuest,
  decryptTokens,
  encryptTokens,
  equalSecret,
  nonce,
} from "./session-crypto";
import {
  command,
  createStoredSession,
  destroySession,
  loadSession,
  redis,
  sessionKey,
  SessionError,
  withSessionLock,
  type StoredSession,
} from "./session-store";

const production = process.env.NODE_ENV === "production";
export const sessionCookie = production
  ? "__Host-eventgate.sid"
  : "eventgate.sid";
const guestCookie = production ? "__Host-eventgate.csrf" : "eventgate.csrf";
const cookieOptions = {
  httpOnly: true,
  secure: production,
  sameSite: "lax" as const,
  path: "/",
};
export const backendAuthSchema = z.object({
  user: authUserSchema,
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresIn: z.number().positive(),
});
export { upstream } from "./upstream";
export async function currentSession() {
  return loadSession((await cookies()).get(sessionCookie)?.value);
}
export async function clearBrowserCookies(includeGuest = true) {
  const jar = await cookies();
  for (const name of [
    sessionCookie,
    "eventgate_session",
    ...(includeGuest ? [guestCookie] : []),
  ])
    jar.set(name, "", { ...cookieOptions, maxAge: 0 });
}
export async function invalidate(session: StoredSession) {
  await destroySession(session.id).catch(() => {
    console.error("BFF_SESSION_INVALIDATION_UNAVAILABLE");
  });
}
export async function csrfBootstrap() {
  const session = await currentSession();
  if (session) return session.record.csrf;
  const jar = await cookies();
  let value = jar.get(guestCookie)?.value;
  if (!value || !/^[\w-]{43}$/.test(value)) {
    value = nonce();
    jar.set(guestCookie, value, { ...cookieOptions, maxAge: 1800 });
  }
  return csrfForGuest(value);
}
export async function checkCsrf(
  request: Request,
  session: StoredSession | null,
) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new SessionError("ORIGIN_NOT_ALLOWED", 403);
  const provided = request.headers.get("x-eventgate-csrf") ?? "";
  const guest = (await cookies()).get(guestCookie)?.value;
  const expected = session?.record.csrf ?? (guest ? csrfForGuest(guest) : "");
  if (!provided || !expected || !equalSecret(provided, expected))
    throw new SessionError("CSRF_INVALID", 403);
}
export async function establishSession(
  data: z.infer<typeof backendAuthSchema>,
) {
  const jar = await cookies();
  const id = nonce();
  const absoluteExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  try {
    const previousId = jar.get(sessionCookie)?.value;
    if (previousId) {
      const previous = await loadSession(previousId);
      if (previous) await logoutSession(previous);
    }
    const record = {
      user: data.user,
      tokens: encryptTokens(
        { accessToken: data.accessToken, refreshToken: data.refreshToken },
        sessionKey(id),
      ),
      accessExpiresAt: Date.now() + data.accessTokenExpiresIn * 1000,
      absoluteExpiresAt,
      version: 1,
      csrf: nonce(),
    };
    await createStoredSession(record, id);
  } catch (error) {
    await upstream("auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: data.refreshToken }),
    }).catch(() => undefined);
    await clearBrowserCookies();
    throw error;
  }
  jar.set(sessionCookie, id, {
    ...cookieOptions,
    expires: new Date(absoluteExpiresAt),
  });
  jar.set(guestCookie, "", { ...cookieOptions, maxAge: 0 });
  jar.set("eventgate_session", "", { ...cookieOptions, maxAge: 0 });
  return { user: data.user };
}
export async function refreshSession(observed: StoredSession, force = false) {
  if (!force && observed.record.accessExpiresAt > Date.now() + 30000)
    return observed;
  return withSessionLock(observed.id, async (latest, save) => {
    // A waiting request consumes the winner's persisted tokens, never the old token.
    if (
      latest.record.version !== observed.record.version ||
      (!force && latest.record.accessExpiresAt > Date.now() + 30000)
    )
      return latest;
    try {
      const tokens = decryptTokens(latest.record.tokens, latest.key);
      const response = await upstream("auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (!response.ok) throw new SessionError("SESSION_EXPIRED", 401);
      const payload = await response.json();
      const data = backendAuthSchema.parse(payload.data);
      if (data.user.id !== latest.record.user.id)
        throw new SessionError("SESSION_INVALID", 401);
      const record = {
        ...latest.record,
        user: data.user,
        tokens: encryptTokens(data, latest.key),
        accessExpiresAt: Date.now() + data.accessTokenExpiresIn * 1000,
        version: latest.record.version + 1,
      };
      await save(record);
      return { ...latest, record };
    } catch {
      await invalidate(latest);
      console.error("BFF_REFRESH_FAILED_CLOSED");
      throw new SessionError("SESSION_EXPIRED", 401);
    }
  });
}
export async function authenticatedFetch(
  session: StoredSession,
  path: string,
  init: RequestInit = {},
) {
  let active = await refreshSession(session);
  const send = (current: StoredSession) => {
    const headers = new Headers(init.headers);
    headers.set(
      "Authorization",
      `Bearer ${decryptTokens(current.record.tokens, current.key).accessToken}`,
    );
    return upstream(path, { ...init, headers });
  };
  let response = await send(active);
  if (response.status === 401) {
    const error = await response
      .clone()
      .json()
      .catch(() => ({}));
    if (
      error.errors?.some(
        (item: { code?: string }) => item.code === "ACCOUNT_INACTIVE",
      )
    ) {
      await invalidate(active);
      throw new SessionError("ACCOUNT_INACTIVE", 401);
    }
    active = await refreshSession(active, true);
    response = await send(active);
    if (response.status === 401) {
      await invalidate(active);
      throw new SessionError("SESSION_EXPIRED", 401);
    }
  }
  return response;
}
export async function sessionIdentity(
  session: StoredSession,
): Promise<AuthUser> {
  let response = await authenticatedFetch(session, "users/me/identity");
  // Permit frontend/backend rolling deployments in either order.
  if (response.status === 404)
    response = await authenticatedFetch(session, "users/me");
  if (!response.ok)
    throw new SessionError(
      response.status === 403 ? "FORBIDDEN" : "API_UNAVAILABLE",
      response.status === 403 ? 403 : 503,
    );
  const payload = await response.json();
  const user = authUserSchema.parse(payload.data);
  if (user.id !== session.record.user.id) {
    await invalidate(session);
    throw new SessionError("SESSION_INVALID", 401);
  }
  return user;
}
export async function logoutSession(session: StoredSession) {
  // Delete first: a concurrent refresh CAS cannot resurrect a logged-out record.
  try {
    await destroySession(session.id);
  } finally {
    const tokens = decryptTokens(session.record.tokens, session.key);
    const response = await upstream("auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    }).catch(() => null);
    if (!response?.ok) {
      console.error("BFF_LOGOUT_REVOCATION_UNAVAILABLE");
      throw new SessionError("LOGOUT_REVOCATION_UNAVAILABLE");
    }
  }
}
export async function ensureSessionInfrastructure() {
  await command((await redis()).ping());
}
