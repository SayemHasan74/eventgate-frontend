import type { Metadata } from "next";

import { AdminDashboard } from "./admin-dashboard";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "Platform operations",
  description: "EventGate platform administration and operational reporting.",
};

export default function AdminPage() {
  return (
    <>
      <section className={`${styles.page} wrap`}>
        <AdminDashboard />
      </section>
    </>
  );
}
