"use client";
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
import { resetCsrf } from "@/lib/session-fetch";
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
      setStatus(next ? "authenticated" : "anonymous");
    },
    [client],
  );
  const retrySession = useCallback(() => {
    if (pending.current) return pending.current;
    const version = generation.current;
    pending.current = (async () => {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "same-origin",
          signal: AbortSignal.timeout(25000),
        });
        const payload = await response.json();
        if (version !== generation.current) return;
        if (response.status === 401) {
          apply(null);
          resetCsrf();
          return;
        }
        if (!response.ok) {
          setStatus("unavailable");
          return;
        }
        apply(
          payload.data?.state === "authenticated"
            ? { user: authUserSchema.parse(payload.data.session.user) }
            : null,
        );
      } catch {
        if (version === generation.current) setStatus("unavailable");
      } finally {
        pending.current = null;
      }
    })();
    return pending.current;
  }, [apply]);
  const broadcast = useCallback((type: "logout" | "changed") => {
    if (channel.current) channel.current.postMessage(type);
    else
      window.localStorage.setItem(
        "eventgate.auth-event",
        JSON.stringify({ type, at: Date.now() }),
      );
  }, []);
  const clearSession = useCallback(() => {
    generation.current += 1;
    resetCsrf();
    client.clear();
    window.sessionStorage.removeItem("eventgate.booking-intent");
    apply(null);
    broadcast("logout");
  }, [apply, broadcast, client]);
  const setSession = useCallback(
    (next: AuthSession) => {
      generation.current += 1;
      client.clear();
      resetCsrf();
      apply({ user: authUserSchema.parse(next.user) });
      broadcast("changed");
    },
    [apply, broadcast, client],
  );
  useEffect(() => {
    window.localStorage.removeItem("eventgate.session");
    document.cookie = "eventgate_session=; Path=/; Max-Age=0; SameSite=Lax";
    const receive = (type: unknown) => {
      generation.current += 1;
      resetCsrf();
      client.clear();
      if (type === "logout") apply(null);
      else {
        pending.current = null;
        void retrySession();
      }
    };
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("eventgate.auth");
      channel.current.onmessage = (event) => receive(event.data);
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
      generation.current += 1;
      resetCsrf();
      client.clear();
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
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
