"use client";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

export function SessionUnavailable() {
  const router = useRouter();
  return (
    <section className="not-found" role="alert">
      <ThemeToggle />
      <h1>Connection unavailable</h1>
      <p>
        Your private workspace could not be opened. Try again when the
        connection recovers.
      </p>
      <button
        className="button button-primary"
        type="button"
        onClick={() => router.refresh()}
      >
        Retry connection
      </button>
    </section>
  );
}
