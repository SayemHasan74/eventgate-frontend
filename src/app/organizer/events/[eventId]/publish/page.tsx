import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { PublishReview } from "./publish-review";
import styles from "./publish-review.module.css";

export const metadata: Metadata = { title: "Publish event", description: "Review and publish an EventGate organizer event." };

export default function PublishEventPage() {
  return <div className="site-shell"><SiteHeader /><main id="main-content" className={`${styles.page} wrap`}><Link className={styles.back} href="/organizer"><ArrowLeft size={16} aria-hidden="true" /> Organizer workspace</Link><PublishReview /></main><SiteFooter /></div>;
}
