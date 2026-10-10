import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { TicketWallet } from "./ticket-wallet";
import styles from "./tickets.module.css";

export const metadata: Metadata = { title: "My tickets", description: "View your EventGate event passes and QR tickets." };

export default function TicketsPage() {
  return <div className="site-shell"><SiteHeader /><main id="main-content" className={`${styles.page} wrap`}><TicketWallet /></main><SiteFooter /></div>;
}
