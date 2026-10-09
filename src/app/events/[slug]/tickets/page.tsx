import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicEvent } from "@/lib/eventgate-api";

import styles from "./ticket-selector.module.css";
import { TicketSelector } from "./ticket-selector";

type TicketsPageProps = Readonly<{ params: Promise<{ slug: string }> }>;

const eventDate = (value: string) => new Intl.DateTimeFormat("en-BD", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(value));

export const metadata: Metadata = { title: "Select tickets" };

export default async function TicketsPage({ params }: TicketsPageProps) {
  const { slug } = await params;
  const result = await getPublicEvent(slug);
  if (result.status === "not-found") notFound();

  return (
    <div className="site-shell">
      <SiteHeader />
      {result.status === "unavailable" ? (
        <main id="main-content" className={`${styles.page} wrap`}><EmptyState title="Ticket selection is unavailable." description="EventGate could not load ticket availability right now. Please try again in a moment." /></main>
      ) : (
        <main id="main-content" className={`${styles.page} wrap`}>
          <Link className={styles.back} href={`/events/${slug}`}><ArrowLeft size={16} aria-hidden="true" /> Back to event</Link>
          <header className={styles.eventStrip}>
            <div><p>Now reserving for</p><h1>{result.event.title}</h1></div>
            <div><span><CalendarDays size={15} /> {eventDate(result.event.startAt)}</span><span><MapPin size={15} /> {result.event.venue}, {result.event.city}</span></div>
          </header>
          <TicketSelector now={result.retrievedAt} tiers={result.event.ticketTiers} />
        </main>
      )}
      <SiteFooter />
    </div>
  );
}
