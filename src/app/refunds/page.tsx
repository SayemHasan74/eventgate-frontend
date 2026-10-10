import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { RefundHistory } from "./refund-history";
import styles from "./refunds.module.css";

export const metadata: Metadata = { title: "Refund history", description: "Track EventGate ticket refund requests." };

export default function RefundsPage() {
  return <div className="site-shell"><SiteHeader /><main id="main-content" className={`${styles.page} wrap`}><RefundHistory /></main><SiteFooter /></div>;
}
