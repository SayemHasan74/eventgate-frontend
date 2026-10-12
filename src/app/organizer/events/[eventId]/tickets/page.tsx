import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { TierForm } from "./tier-form";
import styles from "./tier-form.module.css";

export const metadata: Metadata = {
  title: "Ticket tiers",
  description: "Create ticket tiers for an EventGate draft event.",
};

export default function TicketTiersPage() {
  return (
    <>
      <section className={`${styles.page} wrap`}>
        <Link className={styles.back} href="/organizer">
          <ArrowLeft size={16} aria-hidden="true" /> Organizer workspace
        </Link>
        <TierForm />
      </section>
    </>
  );
}
