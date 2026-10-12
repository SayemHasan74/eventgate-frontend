import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ReportDashboard } from "./report-dashboard";
import styles from "./report-dashboard.module.css";

export const metadata: Metadata = {
  title: "Event reports",
  description: "View EventGate event sales, inventory, and check-in reporting.",
};

export default function ReportsPage() {
  return (
    <>
      <section className={`${styles.page} wrap`}>
        <Link className={styles.back} href="/organizer">
          <ArrowLeft size={16} aria-hidden="true" /> Organizer workspace
        </Link>
        <ReportDashboard />
      </section>
    </>
  );
}
