import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { AdminRefundDesk } from "./admin-refund-desk";
import styles from "./admin-refunds.module.css";

export const metadata: Metadata = { title: "Refund operations", description: "Review and process EventGate refund requests." };

export default function AdminRefundsPage() {
  return <div className="site-shell"><SiteHeader /><main id="main-content" className={`${styles.page} wrap`}><AdminRefundDesk /></main><SiteFooter /></div>;
}
