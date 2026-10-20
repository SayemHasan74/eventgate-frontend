import { WorkspaceQuery } from "@/components/workspace-query";
import { managedEventDetailSchema } from "@/lib/organizer-api";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { TierForm } from "./tier-form";
import styles from "./tier-form.module.css";

export const metadata: Metadata = {
  title: "Ticket tiers",
  description: "Manage saved ticket inventory and sales controls.",
};

export default async function TicketTiersPage({
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
        <TierForm />
      </section>
    </WorkspaceQuery>
  );
}
