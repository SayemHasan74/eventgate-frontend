import type { Metadata } from "next";
import { BackButton } from "@/components/back-button";

import { TicketPass } from "./ticket-pass";
import styles from "./ticket-pass.module.css";

export const metadata: Metadata = {
  title: "Ticket pass",
  description: "Your private EventGate QR event pass.",
};

export default function TicketPassPage() {
  return (
    <>
      <section className={`${styles.page} wrap`}>
        <BackButton className={styles.back} fallback="/tickets" />
        <TicketPass />
      </section>
    </>
  );
}
