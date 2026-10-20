import { WorkspaceQuery } from "@/components/workspace-query";
import { managedEventDetailSchema } from "@/lib/organizer-api";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ReportDashboard } from "./report-dashboard";
import styles from "./report-dashboard.module.css";

export const metadata: Metadata = {
  title: "Event reports",
  description: "View EventGate event sales, inventory, and check-in reporting.",
};

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <WorkspaceQuery
      path={`organizer/events/${encodeURIComponent(eventId)}`}
      domain="organizer-events"
      resource={eventId}
      schema={managedEventDetailSchema}
    >
      <section className={`${styles.page} wrap`}>
        <Link className={styles.back} href="/organizer">
          <ArrowLeft size={16} aria-hidden="true" /> Organizer workspace
        </Link>
        <Suspense
          fallback={<p className={styles.loading}>Loading event reports…</p>}
        >
          <ReportDashboard />
        </Suspense>
      </section>
    </WorkspaceQuery>
  );
}
