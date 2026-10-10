import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { AdminDashboard } from "./admin-dashboard";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "Platform operations", description: "EventGate platform administration and operational reporting." };

export default function AdminPage() {
  return <div className="site-shell"><SiteHeader /><main id="main-content" className={`${styles.page} wrap`}><AdminDashboard /></main><SiteFooter /></div>;
}
