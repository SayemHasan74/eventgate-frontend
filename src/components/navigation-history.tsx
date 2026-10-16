"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
const currentPath = () => window.location.pathname + window.location.search;
export function NavigationHistory() {
  const pathname = usePathname(),
    search = useSearchParams();
  const last = useRef<string | null>(null);
  useEffect(() => {
    // A browser Back/Forward restores an existing entry, including its return path.
    const restore = () => {
      last.current = currentPath();
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useLayoutEffect(() => {
    const current = currentPath();
    if (last.current && last.current !== current) {
      window.history.replaceState(
        { ...window.history.state, eventgatePreviousPath: last.current },
        "",
        window.location.href,
      );
    }
    last.current = current;
  }, [pathname, search]);
  return null;
}
