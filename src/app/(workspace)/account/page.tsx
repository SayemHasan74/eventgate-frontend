import { WorkspaceQuery } from "@/components/workspace-query";
import { overviewSchema } from "@/lib/account-api";
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
    <WorkspaceQuery
      path="users/me/overview"
      domain="overview"
      schema={overviewSchema}
    >
      <section className={`${styles.page} wrap`}>
        <AccountDashboard />
      </section>
      <Recommendations deferUntilOverview />
    </WorkspaceQuery>
  );
}
