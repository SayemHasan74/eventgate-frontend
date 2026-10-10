import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { AccountDashboard } from "./account-dashboard";
import styles from "./account.module.css";

export const metadata: Metadata = { title: "My account", description: "Manage your EventGate tickets and reservations." };

export default function AccountPage() {
  return <div className="site-shell"><SiteHeader /><main id="main-content" className={`${styles.page} wrap`}><AccountDashboard /></main><SiteFooter /></div>;
}
