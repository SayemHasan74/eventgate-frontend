import type { Metadata } from "next";

import { TicketWallet } from "./ticket-wallet";
import styles from "./tickets.module.css";

export const metadata: Metadata = {
  title: "My tickets",
  description: "View your EventGate event passes and QR tickets.",
};

export default function TicketsPage() {
  return (
    <>
      <section className={`${styles.page} wrap`}>
        <TicketWallet />
      </section>
    </>
  );
}
