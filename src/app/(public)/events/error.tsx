"use client";

import styles from "./events.module.css";

import { ErrorState } from "@/components/ui/interactive";

export default function EventsError({
  reset,
}: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <main className={[styles["events-page"], "wrap"].join(" ")}>
      <ErrorState
        message="The event programme could not load. Please try again."
        retry={reset}
      />
    </main>
  );
}
