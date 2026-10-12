"use client";
import Link from "next/link";
import { readError } from "@/lib/read-error";
export function ReadFailure({
  error,
  retry,
  fetching = false,
  next,
}: {
  error: unknown;
  retry: () => void;
  fetching?: boolean;
  next: string;
}) {
  const info = readError(error);
  return (
    <section role="alert">
      <h2>{info.title}</h2>
      <p>{info.message}</p>
      {info.retry ? (
        <button
          type="button"
          className="button"
          disabled={fetching}
          onClick={retry}
        >
          Retry this read
        </button>
      ) : (
        <Link
          className="button"
          href={
            info.title === "Sign-in required"
              ? `/auth/sign-in?next=${encodeURIComponent(next)}`
              : "/account"
          }
        >
          {info.title === "Sign-in required" ? "Sign in" : "My account"}
        </Link>
      )}
    </section>
  );
}
