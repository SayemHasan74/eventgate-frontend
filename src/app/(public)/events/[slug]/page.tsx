import { EventAi } from "@/components/event-ai";
import type { Metadata } from "next";
import { Suspense } from "react";
import {
  SaveEventButton,
  SaveIntentNotice,
} from "@/components/save-event-button";
import { ArrowLeft, CalendarDays, Clock3, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventImage } from "@/components/event-image";
import { EventActions } from "@/components/event-actions";
import { EventPurchase } from "@/components/event-purchase";
import { EmptyState } from "@/components/empty-state";
import { PublicRetry } from "@/components/public-retry";
import { getPublicEvent, type PublicEvent } from "@/lib/eventgate-api";
import { eventSaleSummary, tierSaleState } from "@/lib/public-sale";
import { formatMoney, formatEventRange } from "@/lib/format";
import { eventUrl } from "@/lib/event-url";
import styles from "./event-details.module.css";
import { WaitlistControl } from "@/components/waitlist-control";

type EventPageProps = Readonly<{ params: Promise<{ slug: string }> }>;
const labels = {
  OPEN: "On sale",
  UPCOMING: "Coming soon",
  PAUSED: "Sales paused",
  SOLD_OUT: "Sold out",
  CLOSED: "Sales closed",
};
function EventDetails({ event }: { event: PublicEvent }) {
  const sale = eventSaleSummary(event);
  const url = eventUrl(event.slug);
  const purchase = (
    <EventPurchase
      slug={event.slug}
      eligible={sale.state === "OPEN"}
      reason={sale.label + ". No tier is currently eligible for reservation."}
    />
  );
  return (
    <main id="main-content" className={`${styles.page} wrap`}>
      <Link className={styles.back} href="/events">
        <ArrowLeft size={16} /> All events
      </Link>
      <div className={styles.layout}>
        <div>
          <div className={styles.cover}>
            <EventImage publicView src={event.imageUrl} title={event.title} />
          </div>
          <header className={styles.hero}>
            <p className="eyebrow">
              <span />
              {event.category}
            </p>
            <h1>{event.title}</h1>
            <p>
              Organized by <strong>{event.organizer.displayName}</strong>
            </p>
          </header>
          <section
            className={styles.information}
            aria-label="Event information"
          >
            <div>
              <CalendarDays size={20} />
              <h2>Date and time</h2>
              <strong>{formatEventRange(event.startAt, event.endAt)}</strong>
              <p>
                <Clock3 size={14} /> Asia/Dhaka · Bangladesh · UTC+06:00
              </p>
            </div>
            <div>
              <MapPin size={20} />
              <h2>Venue</h2>
              <strong>{event.venue}</strong>
              <p>
                {event.address}, {event.city}
              </p>
              <a
                className="text-link"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue + ", " + event.address + ", " + event.city)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get directions ↗
              </a>
            </div>
          </section>
          <EventAi slug={event.slug} />
          <section className={styles.panel} aria-labelledby="about-heading">
            <h2 id="about-heading">About this event</h2>
            <p className={styles.description}>{event.description}</p>
          </section>
          <section
            className={styles.panel}
            aria-labelledby="ticket-tiers-heading"
          >
            <h2 id="ticket-tiers-heading">Choose your ticket tier</h2>
            <p>
              Availability updated recently. Listings may be cached for up to 60
              seconds. We check fresh stock before reservation.
            </p>
            {event.ticketTiers.length ? (
              <ul className={styles.list}>
                {event.ticketTiers.map((tier) => {
                  const state =
                    event.status && event.status !== "PUBLISHED"
                      ? "CLOSED"
                      : tierSaleState(tier, event.startAt);
                  return (
                    <li
                      className={styles.tier}
                      id={`tier-${tier.id}`}
                      key={tier.id}
                    >
                      <div>
                        <span className={styles.status}>{labels[state]}</span>
                        <h3>{tier.name}</h3>
                        <WaitlistControl
                          eventId={event.id}
                          tierId={tier.id}
                          slug={event.slug}
                          saleState={state}
                        />
                        <p>
                          {state === "UPCOMING"
                            ? `Sales open ${formatEventRange(tier.salesStartAt, tier.salesEndAt)} (Bangladesh time)`
                            : `${tier.availableQuantity} tickets remaining at last update`}
                        </p>
                      </div>
                      <strong>{formatMoney(tier.pricePaisa)}</strong>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No ticket tiers have been released yet.</p>
            )}
          </section>
          <section className={styles.panel} aria-labelledby="policy-heading">
            <h2 id="policy-heading">Booking and refund policy</h2>
            <p>
              A reservation holds tickets for 15 minutes. Payment must be
              verified before your private QR passes are issued. Each QR admits
              one ticket once.
            </p>
            <p>
              Attendee refund requests require a paid, verified booking, unused
              valid tickets and at least 24 hours before the event starts.
              Requests are reviewed by an administrator; provider processing is
              not instant. Your order shows its current eligibility and refund
              status.
            </p>
          </section>
          <section className={styles.panel} aria-label="Share and calendar">
            <EventActions event={event} url={url} />
          </section>
        </div>
        <aside className={styles.buying} aria-label="Buying summary">
          <p className="eyebrow">
            <span /> Ticket desk
          </p>
          <h2>{sale.label}</h2>
          {sale.pricePaisa !== null && (
            <strong className={styles.price}>
              {sale.futurePrice ? "Future price from " : "From "}
              {formatMoney(sale.pricePaisa)}
            </strong>
          )}
          <p>
            {event.venue}, {event.city}
          </p>
          {purchase}
          <Suspense fallback={null}>
            <SaveIntentNotice eventId={event.id} />
          </Suspense>
          <SaveEventButton
            eventId={event.id}
            slug={event.slug}
            title={event.title}
            startAt={event.startAt}
          />
          <p className={styles.note}>
            Select a tier and quantity next. Nothing is charged on this page.
          </p>
        </aside>
      </div>
      <div
        className={styles.mobilePurchase}
        aria-label="Mobile purchase action"
      >
        {purchase}
      </div>
    </main>
  );
}
export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicEvent(slug);
  if (result.status !== "ready")
    return { title: "Event details", robots: { index: false } };
  const event = result.event;
  const description = event.description
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  const url = eventUrl(event.slug);
  return {
    title: event.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: event.title,
      description,
      url,
      siteName: "EventGate",
      type: "website",
      ...(event.imageUrl?.startsWith("https://")
        ? { images: [{ url: event.imageUrl, alt: event.title }] }
        : {}),
    },
  };
}
export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const result = await getPublicEvent(slug);
  if (result.status === "not-found") notFound();
  return result.status === "unavailable" ? (
    <main id="main-content" className={`${styles.page} wrap`}>
      <EmptyState
        title="This event desk is unavailable."
        description="The event could not load right now. Your navigation still works."
        action={<PublicRetry />}
      />
    </main>
  ) : (
    <EventDetails event={result.event} />
  );
}
