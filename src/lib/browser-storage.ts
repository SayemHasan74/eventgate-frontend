"use client";

// Storage can be disabled by browser policy. Authentication must not depend on it.
export function removeBrowserStorage(
  kind: "localStorage" | "sessionStorage",
  key: string,
) {
  try {
    window[kind].removeItem(key);
  } catch {
    // The HttpOnly session and in-memory state remain authoritative.
  }
}

export function announceAuthChange(type: "logout" | "changed") {
  try {
    window.localStorage.setItem(
      "eventgate.auth-event",
      JSON.stringify({ type, at: Date.now() }),
    );
  } catch {
    // Without storage or BroadcastChannel, other tabs revalidate on focus/interval.
  }
}
