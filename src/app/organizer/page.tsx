import type { Metadata } from "next";

import { OrganizerDashboard } from "./organizer-dashboard";
import styles from "./organizer.module.css";

export const metadata: Metadata = {
  title: "Organizer workspace",
  description: "Manage EventGate events as an organizer.",
};

export default function OrganizerPage() {
  return (
    <>
      <section className={`${styles.page} wrap`}>
        <OrganizerDashboard />
      </section>
    </>
  );
}
