import Link from "next/link";
import type { PublicEvent } from "@/lib/eventgate-api";
import { eventSaleSummary } from "@/lib/public-sale";
import { formatMoney, formatEventRange } from "@/lib/format";
import { EventImage } from "./event-image";
import styles from "./event-card.module.css";
import { SaveEventButton } from "./save-event-button";
export function EventCard({ event }: { event: PublicEvent }) {
  const sale = eventSaleSummary(event);
  return (
    <article className={styles.card}>
      <Link href={`/events/${event.slug}`} aria-label={`View ${event.title}`}>
        <EventImage publicView src={event.imageUrl} title={event.title} />
      </Link>
      <div className={styles.body}>
        <small>{event.category}</small>
        <h2>
          <Link href={`/events/${event.slug}`}>{event.title}</Link>
        </h2>
        <p>{formatEventRange(event.startAt, event.endAt)}</p>
        <p>
          {event.venue}, {event.city}
        </p>
        <div className={styles.sale}>
          <span>{sale.label}</span>
          {sale.pricePaisa !== null && (
            <strong>
              {sale.futurePrice ? "Future price from " : "From "}
              {formatMoney(sale.pricePaisa)}
            </strong>
          )}
        </div>
        <Link className="text-link" href={`/events/${event.slug}`}>
          Event details →
        </Link>
        <SaveEventButton
          eventId={event.id}
          slug={event.slug}
          title={event.title}
          startAt={event.startAt}
        />
      </div>
    </article>
  );
}
