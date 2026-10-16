"use client";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { backDestination } from "@/lib/navigation";
export function BackButton({
  fallback,
  className,
}: {
  fallback: "/orders" | "/tickets";
  className?: string;
}) {
  const router = useRouter();
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (cleanup.current) return;
        const current = window.location.pathname + window.location.search;
        const previous = window.history.state?.eventgatePreviousPath;
        const destination = backDestination(previous, current, fallback);
        if (destination !== previous) {
          router.replace(destination);
          return;
        }
        // Duplicate entries, hash-only history and direct entry must never leave Back inert.
        const finish = () => {
          clearTimeout(timer);
          window.removeEventListener("popstate", moved);
          cleanup.current = null;
        };
        const moved = () => {
          finish();
          if (window.location.pathname + window.location.search === current)
            router.replace(destination);
        };
        const timer = setTimeout(() => {
          finish();
          if (window.location.pathname + window.location.search === current)
            router.replace(destination);
        }, 700);
        cleanup.current = finish;
        window.addEventListener("popstate", moved, { once: true });
        router.back();
      }}
    >
      <ArrowLeft size={16} aria-hidden="true" /> Back
    </button>
  );
}
