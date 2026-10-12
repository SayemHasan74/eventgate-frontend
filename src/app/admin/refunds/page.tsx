import type { Metadata } from "next";

import { AdminRefundDesk } from "./admin-refund-desk";
import styles from "./admin-refunds.module.css";

export const metadata: Metadata = {
  title: "Refund operations",
  description: "Review and process EventGate refund requests.",
};

export default function AdminRefundsPage() {
  return (
    <>
      <section className={`${styles.page} wrap`}>
        <AdminRefundDesk />
      </section>
    </>
  );
}
