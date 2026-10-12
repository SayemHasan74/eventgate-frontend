import type { Metadata } from "next";
import { Suspense } from "react";

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
        <Suspense fallback={<p>Loading refund desk…</p>}>
          <AdminRefundDesk />
        </Suspense>
      </section>
    </>
  );
}
