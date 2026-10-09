import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, Clock3, MapPin, Ticket } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "./event-details.module.css";

import { EmptyState } from "@/components/empty-state";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicEvent, type PublicEvent, type PublicTicketTier } from "@/lib/eventgate-api";

type EventPageProps = Readonly<{ params: Promise<{ slug: string }> }>;

const bangladeshDate = (value: string) =>
  new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));

const bangladeshTime = (value: string) =>
  new Intl.DateTimeFormat("en-BD", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));

const price = (paisa: number) => `৳${new Intl.NumberFormat("en-BD").format(paisa / 100)}`;

const saleLabel = (tier: PublicTicketTier) => {
  const now = Date.now();
  if (tier.availableQuantity === 0) return "Sold out";
  if (new Date(tier.salesEndAt).getTime() < now) return "Sales closed";
  if (new Date(tier.salesStartAt).getTime() > now) return "Coming soon";
  return "Available now";
};

function TicketTier({ tier }: Readonly<{ tier: PublicTicketTier }>) {
  const status = saleLabel(tier);
  const statusClass = status === "Coming soon" ? styles.soon : status === "Available now" ? "" : styles.closed;
  return (
    <li className={styles.tier}>
      <div>
        <p className={`${styles.status} ${statusClass}`}>{status}</p>
        <h3>{tier.name}</h3>
        <p>{tier.availableQuantity} of {tier.capacity} tickets remaining</p>
      </div>
      <strong>{price(tier.pricePaisa)}</strong>
    </li>
  );
}

function EventDetails({ event }: Readonly<{ event: PublicEvent }>) {
  const available = event.ticketTiers.reduce((sum, tier) => sum + tier.availableQuantity, 0);

  return (
    <main id="main-content" className={`${styles.page} wrap`}>
      <Link className={styles.back} href="/events"><ArrowLeft size={16} aria-hidden="true" /> All events</Link>

      <section className={styles.hero}>
        <div className={styles.copy}>
          <p className="eyebrow"><span /> {event.category}</p>
          <h1>{event.title}</h1>
          <p>{event.description}</p>
        </div>
        <aside className={styles.ticketCount} aria-label="Ticket availability">
          <Ticket size={29} aria-hidden="true" />
          <strong>{available}</strong>
          <span>tickets left</span>
        </aside>
      </section>

      <section className={styles.information} aria-label="Event information">
        <div><CalendarDays size={20} aria-hidden="true" /><p>Starts</p><strong>{bangladeshDate(event.startAt)}</strong></div>
        <div><Clock3 size={20} aria-hidden="true" /><p>Time</p><strong>{bangladeshTime(event.startAt)} – {bangladeshTime(event.endAt)}</strong></div>
        <div><MapPin size={20} aria-hidden="true" /><p>Venue</p><strong>{event.venue}</strong><span>{event.address}, {event.city}</span></div>
      </section>

      <section className={styles.tiers} aria-labelledby="ticket-tiers-heading">
        <div>
          <p className="eyebrow"><span /> Choose a tier</p>
          <h2 id="ticket-tiers-heading">Ticket <b>desk.</b></h2>
          <p>Live availability is shown for every ticket tier. Select your tier in the next step.</p>
        </div>
        {event.ticketTiers.length === 0 ? (
          <p className={styles.noTiers}>The organiser has not released ticket tiers yet.</p>
        ) : (
          <ul className={styles.list}>{event.ticketTiers.map((tier) => <TicketTier key={tier.id} tier={tier} />)}</ul>
        )}
      </section>
    </main>
  );
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicEvent(slug);
  return result.status === "ready"
    ? { title: result.event.title, description: result.event.description }
    : { title: "Event details" };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const result = await getPublicEvent(slug);

  if (result.status === "not-found") notFound();

  return (
    <div className="site-shell">
      <SiteHeader />
      {result.status === "unavailable" ? (
        <main id="main-content" className={`${styles.page} wrap`}><EmptyState title="This event desk is unavailable." description="EventGate could not load this event right now. Please try again in a moment." /></main>
      ) : <EventDetails event={result.event} />}
      <SiteFooter />
    </div>
  );
}
