"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
export function PublicRetry() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="button"
      disabled={pending}
      onClick={() => start(() => router.refresh())}
    >
      {pending ? "Retrying…" : "Try again"}
    </button>
  );
}
