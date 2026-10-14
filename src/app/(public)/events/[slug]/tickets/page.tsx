import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { getPublicEvent } from "@/lib/eventgate-api";
import { formatEventRange } from "@/lib/format";

import styles from "./ticket-selector.module.css";
import { TicketSelector } from "./ticket-selector";

type TicketsPageProps = Readonly<{
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tierId?: string | string[] }>;
}>;

export const metadata: Metadata = {
  title: "Select tickets",
  robots: { index: false, follow: false },
};

export default async function TicketsPage({
  params,
  searchParams,
}: TicketsPageProps) {
  const { slug } = await params;
  const result = await getPublicEvent(slug);
  const requestedTier = (await searchParams).tierId;
  const initialTierId =
    typeof requestedTier === "string" &&
    result.status === "ready" &&
    result.event.ticketTiers.some((tier) => tier.id === requestedTier)
      ? requestedTier
      : undefined;
  if (result.status === "not-found") notFound();

  return (
    <>
      {result.status === "unavailable" ? (
        <main id="main-content" className={`${styles.page} wrap`}>
          <EmptyState
            title="Ticket selection is unavailable."
            description="EventGate could not load ticket availability right now. Please try again in a moment."
          />
        </main>
      ) : (
        <main id="main-content" className={`${styles.page} wrap`}>
          <Link className={styles.back} href={`/events/${slug}`}>
            <ArrowLeft size={16} aria-hidden="true" /> Back to event
          </Link>
          <header className={styles.eventStrip}>
            <div>
              <p>Now reserving for</p>
              <h1>{result.event.title}</h1>
            </div>
            <div>
              <span>
                <CalendarDays size={15} />{" "}
                {formatEventRange(result.event.startAt, result.event.endAt)}
              </span>
              <span>
                <MapPin size={15} /> {result.event.venue}, {result.event.city}
              </span>
            </div>
          </header>
          <TicketSelector
            key={`${result.event.id}:${initialTierId ?? "default"}`}
            eventId={result.event.id}
            slug={slug}
            eventStart={result.event.startAt}
            now={result.retrievedAt}
            tiers={result.event.ticketTiers}
            initialTierId={initialTierId}
          />
        </main>
      )}
    </>
  );
}
