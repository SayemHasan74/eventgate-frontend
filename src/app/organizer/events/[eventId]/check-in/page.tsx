import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { CheckInDesk } from "./check-in-desk";
import styles from "./check-in.module.css";

export const metadata: Metadata = {
  title: "Check-in desk",
  description: "Validate attendee tickets at an EventGate event.",
};

export default function CheckInPage() {
  return (
    <>
      <section className={`${styles.page} wrap`}>
        <Link className={styles.back} href="/organizer">
          <ArrowLeft size={16} aria-hidden="true" /> Organizer workspace
        </Link>
        <CheckInDesk />
      </section>
    </>
  );
}
