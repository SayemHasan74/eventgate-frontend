import { WorkspaceQuery } from "@/components/workspace-query";
import { organizerOverviewSchema } from "@/lib/organizer-api";
import type { Metadata } from "next";

import { OrganizerDashboard } from "./organizer-dashboard";
import styles from "./organizer.module.css";

export const metadata: Metadata = {
  title: "Organizer workspace",
  description: "Manage EventGate events as an organizer.",
};

export default function OrganizerPage() {
  return (
    <WorkspaceQuery
      path="organizer/overview"
      domain="organizer-overview"
      resource="summary"
      schema={organizerOverviewSchema}
    >
      <section className={`${styles.page} wrap`}>
        <OrganizerDashboard />
      </section>
    </WorkspaceQuery>
  );
}
