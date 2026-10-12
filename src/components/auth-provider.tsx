"use client";
import { clearOperationKeys } from "@/lib/operation-keys";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authUserSchema, type AuthSession } from "@/lib/auth-types";
import { z } from "zod";
import { apiClient, ApiError } from "@/lib/api-client";
import { resetCsrf } from "@/lib/session-fetch";
import {
  announceAuthChange,
  removeBrowserStorage,
} from "@/lib/browser-storage";
export type { AuthSession, AuthUser } from "@/lib/auth-types";

type State = "loading" | "authenticated" | "anonymous" | "unavailable";
type AuthContextValue = {
  isReady: boolean;
  status: State;
  session: AuthSession | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  retrySession: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, updateSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<State>("loading");
  const [accessDenied, setAccessDenied] = useState(false);
  const client = useQueryClient();
  const channel = useRef<BroadcastChannel | null>(null);
  const generation = useRef(0);
  const currentIdentity = useRef<string | undefined>(undefined);
  const pending = useRef<Promise<void> | null>(null);
  const apply = useCallback(
    (next: AuthSession | null) => {
      const identity = next ? next.user.id + ":" + next.user.role : undefined;
      if (currentIdentity.current !== identity) client.clear();
      currentIdentity.current = identity;
      updateSession(next);
      setAccessDenied(false);
      setStatus(next ? "authenticated" : "anonymous");
    },
    [client],
  );
  const retrySession = useCallback(() => {
    if (pending.current) return pending.current;
    const version = generation.current;
    const request = (async () => {
      try {
        const data = await apiClient(
          "/api/auth/session",
          z.discriminatedUnion("state", [
            z.object({ state: z.literal("anonymous"), session: z.null() }),
            z.object({
              state: z.literal("authenticated"),
              session: z.object({ user: authUserSchema }),
            }),
          ]),
        );
        if (version !== generation.current) return;
        apply(data.session);
      } catch (error) {
        if (version === generation.current) {
          if (error instanceof ApiError && error.status === 401) {
            apply(null);
            resetCsrf();
          } else if (error instanceof ApiError && error.status === 403) {
            setAccessDenied(true);
            setStatus(currentIdentity.current ? "authenticated" : "anonymous");
          } else setStatus("unavailable");
        }
      } finally {
        if (version === generation.current) pending.current = null;
      }
    })();
    pending.current = request;
    return request;
  }, [apply]);
  const broadcast = useCallback((type: "logout" | "changed") => {
    try {
      if (channel.current) channel.current.postMessage(type);
      else announceAuthChange(type);
    } catch {
      announceAuthChange(type);
    }
  }, []);
  const clearSession = useCallback(() => {
    generation.current += 1;
    resetCsrf();
    client.clear();
    pending.current = null;
    removeBrowserStorage("sessionStorage", "eventgate.booking-intent");
    clearOperationKeys();
    apply(null);
    broadcast("logout");
  }, [apply, broadcast, client]);
  const setSession = useCallback(
    (next: AuthSession) => {
      generation.current += 1;
      pending.current = null;
      client.clear();
      resetCsrf();
      apply({ user: authUserSchema.parse(next.user) });
      broadcast("changed");
    },
    [apply, broadcast, client],
  );
  useEffect(() => {
    removeBrowserStorage("localStorage", "eventgate.session");
    document.cookie = "eventgate_session=; Path=/; Max-Age=0; SameSite=Lax";
    const receive = (type: unknown) => {
      generation.current += 1;
      pending.current = null;
      resetCsrf();
      client.clear();
      if (type === "logout") {
        clearOperationKeys();
        removeBrowserStorage("sessionStorage", "eventgate.booking-intent");
        apply(null);
      } else {
        void retrySession();
      }
    };
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel.current = new BroadcastChannel("eventgate.auth");
        channel.current.onmessage = (event) => receive(event.data);
      } catch {
        channel.current = null;
      }
    }
    const storage = (event: StorageEvent) => {
      if (event.key === "eventgate.auth-event" && event.newValue) {
        try {
          receive(JSON.parse(event.newValue).type);
        } catch {
          /* No credentials are stored here. */
        }
      }
    };
    const ended = () => {
      clearOperationKeys();
      generation.current += 1;
      pending.current = null;
      resetCsrf();
      client.clear();
      removeBrowserStorage("sessionStorage", "eventgate.booking-intent");
      apply(null);
      broadcast("logout");
    };
    const focus = () => {
      if (document.visibilityState === "visible") void retrySession();
    };
    window.addEventListener("storage", storage);
    window.addEventListener("eventgate-session-ended", ended);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    const timer = setInterval(focus, 60000);
    void retrySession();
    return () => {
      clearInterval(timer);
      channel.current?.close();
      channel.current = null;
      window.removeEventListener("storage", storage);
      window.removeEventListener("eventgate-session-ended", ended);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [apply, broadcast, client, retrySession]);
  const value = useMemo(
    () => ({
      isReady: status === "authenticated" || status === "anonymous",
      status,
      session,
      setSession,
      clearSession,
      retrySession,
    }),
    [status, session, setSession, clearSession, retrySession],
  );
  return (
    <AuthContext.Provider value={value}>
      {status === "unavailable" && (
        <div role="alert" className="not-found">
          <p>Your session could not be restored. Nothing has been submitted.</p>
          <button type="button" onClick={() => void retrySession()}>
            Retry connection
          </button>
        </div>
      )}
      {accessDenied ? (
        <section className="not-found" role="alert">
          <h1>Access denied</h1>
          <p>
            Your account cannot access this resource. Your session has not been
            ended.
          </p>
          <button type="button" onClick={() => void retrySession()}>
            Check access again
          </button>
          <Link href="/">Back to EventGate</Link>
        </section>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
