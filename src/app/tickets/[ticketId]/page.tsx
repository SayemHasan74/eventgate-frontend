import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { TicketPass } from "./ticket-pass";
import styles from "./ticket-pass.module.css";

export const metadata: Metadata = { title: "Ticket pass", description: "Your private EventGate QR event pass." };

export default function TicketPassPage() {
  return <div className="site-shell"><SiteHeader /><main id="main-content" className={`${styles.page} wrap`}><Link className={styles.back} href="/tickets"><ArrowLeft size={16} aria-hidden="true" /> My tickets</Link><TicketPass /></main><SiteFooter /></div>;
}
