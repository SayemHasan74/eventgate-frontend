"use client";

import { RefreshCw } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

import styles from "./event-details.module.css";

export default function EventDetailsError({
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <>
      <main id="main-content" className={`${styles.page} wrap`}>
        <EmptyState
          title="This event could not be opened."
          description="Please try loading it again."
          action={
            <button
              className="button button-primary"
              type="button"
              onClick={reset}
            >
              <RefreshCw size={16} /> Try again
            </button>
          }
        />
      </main>
    </>
  );
}
