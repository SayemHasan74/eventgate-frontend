import type { Metadata } from "next";

import { RefundHistory } from "./refund-history";
import styles from "./refunds.module.css";

export const metadata: Metadata = {
  title: "Refund history",
  description: "Track EventGate ticket refund requests.",
};

export default function RefundsPage() {
  return (
    <>
      <section className={`${styles.page} wrap`}>
        <RefundHistory />
      </section>
    </>
  );
}
