import type { Metadata } from "next";

import { AccountDashboard } from "./account-dashboard";
import { Recommendations } from "@/components/recommendations";
import styles from "./account.module.css";

export const metadata: Metadata = {
  title: "My account",
  description: "Manage your EventGate tickets and reservations.",
};

export default function AccountPage() {
  return (
    <>
      <section className={`${styles.page} wrap`}>
        <AccountDashboard />
      </section>
      <Recommendations />
    </>
  );
}
