import Link from "next/link";
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
}: {
  event: PublicEvent;
  now?: number;
  reason?: string | null;
}) {
  const sale = eventSaleSummary(event, now);
  const eventPath = `${event.isDemo ? "/demo/events" : "/events"}/${event.slug}`;
  return (
    <article className={styles.card}>
      <Link href={eventPath} aria-label={`View ${event.title}`}>
        <EventImage publicView src={event.imageUrl} title={event.title} />
      </Link>
      <div className={styles.body}>
        {reason && <p>{reason}</p>}
        <small>{event.category}</small>
        {event.isDemo && <small className={styles.demoLabel}>SAMPLE EVENT · SANDBOX</small>}
        <h2>
          <Link href={eventPath}>{event.title}</Link>
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
        <Link className="text-link" href={eventPath}>
          Event details →
        </Link>
        <SaveEventButton
          eventId={event.id}
          slug={event.slug}
          isDemo={event.isDemo}
          title={event.title}
          startAt={event.startAt}
        />
      </div>
    </article>
  );
}
