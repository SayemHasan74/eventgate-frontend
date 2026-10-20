import { WorkspaceQuery } from "@/components/workspace-query";
import { managedEventDetailSchema } from "@/lib/organizer-api";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PublishReview } from "./publish-review";
import styles from "./publish-review.module.css";

export const metadata: Metadata = {
  title: "Publish event",
  description: "Review and publish an EventGate organizer event.",
};

export default async function PublishEventPage({
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
        <PublishReview />
      </section>
    </WorkspaceQuery>
  );
}
