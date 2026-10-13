"use client";
import { useSyncExternalStore } from "react";
const subscribe = (listener: () => void) => {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
};
export const usePageVisible = () =>
  useSyncExternalStore(
    subscribe,
    () => document.visibilityState === "visible",
    () => false,
  );
