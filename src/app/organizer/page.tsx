import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { OrganizerDashboard } from "./organizer-dashboard";
import styles from "./organizer.module.css";

export const metadata: Metadata = { title: "Organizer workspace", description: "Manage EventGate events as an organizer." };

export default function OrganizerPage() {
  return <div className="site-shell"><SiteHeader /><main id="main-content" className={`${styles.page} wrap`}><OrganizerDashboard /></main><SiteFooter /></div>;
}
