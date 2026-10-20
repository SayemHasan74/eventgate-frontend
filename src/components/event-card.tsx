import { EventLink } from "./event-link";
import type { PublicEvent } from "@/lib/eventgate-api";
import { eventSaleSummary } from "@/lib/public-sale";
import { formatMoney, formatEventRange } from "@/lib/format";
import { EventImage } from "./event-image";
import styles from "./event-card.module.css";
import { SaveEventButton } from "./save-event-button";
export function EventCard({
  event,
  now,
  reason,
  priority = false,
}: {
  event: PublicEvent;
  now?: number;
  reason?: string | null;
  priority?: boolean;
}) {
  const sale = eventSaleSummary(event, now);
  return (
    <article className={styles.card}>
      <EventLink
        href={`/events/${event.slug}`}
        aria-label={`View ${event.title}`}
      >
        <EventImage
          publicView
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          src={event.imageUrl}
          title={event.title}
        />
      </EventLink>
      <div className={styles.body}>
        {reason && <p>{reason}</p>}
        <small>{event.category}</small>
        <h2>
          <EventLink href={`/events/${event.slug}`}>{event.title}</EventLink>
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
        <EventLink className="text-link" href={`/events/${event.slug}`}>
          Event details →
        </EventLink>
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
