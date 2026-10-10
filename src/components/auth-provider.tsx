"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: "ATTENDEE" | "ORGANIZER" | "ADMIN";
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
};

type AuthContextValue = {
  isReady: boolean;
  session: AuthSession | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

const storageKey = "eventgate.session";
const sessionChangeEvent = "eventgate-session-change";
const AuthContext = createContext<AuthContextValue | null>(null);

let cachedStoredValue: string | null | undefined;
let cachedSession: AuthSession | null = null;

const subscribeToSession = (listener: () => void) => {
  window.addEventListener("storage", listener);
  window.addEventListener(sessionChangeEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(sessionChangeEvent, listener);
  };
};

const readSession = () => {
  const stored = window.localStorage.getItem(storageKey);
  if (stored === cachedStoredValue) return cachedSession;
  cachedStoredValue = stored;
  try {
    cachedSession = stored ? (JSON.parse(stored) as AuthSession) : null;
  } catch {
    cachedSession = null;
  }
  return cachedSession;
};

const getServerSession = () => null;
const subscribeToMount = () => () => undefined;
const getClientMount = () => true;
const getServerMount = () => false;

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = useSyncExternalStore(subscribeToSession, readSession, getServerSession);
  const isReady = useSyncExternalStore(subscribeToMount, getClientMount, getServerMount);

  const setSession = useCallback((nextSession: AuthSession) => {
    window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
    document.cookie = `eventgate_session=1; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    window.dispatchEvent(new Event(sessionChangeEvent));
  }, []);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    document.cookie = "eventgate_session=; Path=/; Max-Age=0; SameSite=Lax";
    window.dispatchEvent(new Event(sessionChangeEvent));
  }, []);

  const value = useMemo(() => ({ isReady, session, setSession, clearSession }), [clearSession, isReady, session, setSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
