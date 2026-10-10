import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { EventForm } from "./event-form";
import styles from "./event-form.module.css";

export const metadata: Metadata = { title: "Create event", description: "Create an EventGate organizer event draft." };

export default function NewEventPage() {
  return <div className="site-shell"><SiteHeader /><main id="main-content" className={`${styles.page} wrap`}><Link className={styles.back} href="/organizer"><ArrowLeft size={16} aria-hidden="true" /> Organizer workspace</Link><header className={styles.intro}><p className="eyebrow"><span /> New event</p><h1>Create the <b>occasion.</b></h1><p>Start as a draft. You can add ticket tiers and publish only when every detail is ready.</p></header><EventForm /></main><SiteFooter /></div>;
}
