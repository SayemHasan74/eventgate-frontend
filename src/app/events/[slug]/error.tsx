"use client";

import { RefreshCw } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { SiteFooter } from "@/components/site-footer";

import styles from "./event-details.module.css";
import { SiteHeader } from "@/components/site-header";

export default function EventDetailsError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main id="main-content" className={`${styles.page} wrap`}>
        <EmptyState title="This event could not be opened." description="Please try loading it again." action={<button className="button button-primary" type="button" onClick={reset}><RefreshCw size={16} /> Try again</button>} />
      </main>
      <SiteFooter />
    </div>
  );
}
