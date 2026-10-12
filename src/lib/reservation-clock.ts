"use client";
import { useEffect, useRef, useState } from "react";

export function useReservationClock(
  serverTime: string | undefined,
  expiresAt: string | null | undefined,
  pending: boolean,
  refresh: () => void,
) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const announcedExpiry = useRef<string | null>(null);
  useEffect(() => {
    if (!pending || !serverTime || !expiresAt) {
      setRemaining(null);
      return;
    }
    const initial = Math.max(0, Date.parse(expiresAt) - Date.parse(serverTime));
    const receivedAt = performance.now();
    const tick = () => {
      const value = Math.max(0, initial - (performance.now() - receivedAt));
      setRemaining(value);
      if (value === 0 && announcedExpiry.current !== expiresAt) {
        announcedExpiry.current = expiresAt;
        refresh();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [serverTime, expiresAt, pending, refresh]);
  useEffect(() => {
    const focus = () => {
      if (document.visibilityState !== "visible") return;
      setRemaining(null);
      refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refresh]);
  return remaining;
}
