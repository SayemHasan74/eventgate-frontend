import Link from "next/link";
import type { PublicEvent } from "@/lib/eventgate-api";
import { formatCurrency, formatEventDate } from "@/lib/format";
import styles from "./ui/ui.module.css";
export function EventCard({ event }: { event: PublicEvent }) {
  const available = event.ticketTiers.reduce(
    (sum, tier) => sum + tier.availableQuantity,
    0,
  );
  const lowest = event.ticketTiers.length
    ? Math.min(...event.ticketTiers.map((tier) => tier.pricePaisa))
    : null;
  return (
    <article className={styles.eventCard}>
      <div>
        <small>{event.category}</small>
        <h2>
          <Link href={`/events/${event.slug}`}>{event.title}</Link>
        </h2>
        <p>{event.description}</p>
        <p>{formatEventDate(event.startAt)}</p>
        <p>
          {event.venue}, {event.city}
        </p>
      </div>
      <aside>
        <strong>
          {lowest === null
            ? "No tiers available"
            : `From ${formatCurrency(lowest)}`}
        </strong>
        <span>{available} tickets available</span>
        <Link className={styles.button} href={`/events/${event.slug}`}>
          Event details →
        </Link>
      </aside>
    </article>
  );
}
