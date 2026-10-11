"use client";

let csrfRequest: Promise<string> | undefined;
export function resetCsrf() {
  csrfRequest = undefined;
}
export function csrfToken() {
  if (!csrfRequest)
    csrfRequest = fetch("/api/auth/csrf", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || typeof payload.data?.csrf !== "string")
          throw new Error("Session service unavailable. Please try again.");
        return payload.data.csrf as string;
      })
      .catch((error) => {
        csrfRequest = undefined;
        throw error;
      });
  return csrfRequest;
}
export async function sessionFetch(path: string, init: RequestInit = {}) {
  if (!path.startsWith("/api/") || path.includes("\\"))
    throw new Error("Private requests must use the same-origin API.");
  const headers = new Headers(init.headers);
  headers.delete("Authorization");
  const mutation = !["GET", "HEAD"].includes(
    (init.method ?? "GET").toUpperCase(),
  );
  if (mutation) headers.set("x-eventgate-csrf", await csrfToken());
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  if (response.status === 401)
    window.dispatchEvent(new Event("eventgate-session-ended"));
  if (response.status === 403 && mutation) {
    const payload = await response
      .clone()
      .json()
      .catch(() => ({}));
    if (
      payload.errors?.some(
        (error: { code?: string }) => error.code === "CSRF_INVALID",
      )
    )
      resetCsrf();
  }
  return response;
}
