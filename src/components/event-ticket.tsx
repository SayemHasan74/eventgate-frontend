import type { ReactNode } from "react";
import type { ManagedEventDetail } from "@/lib/organizer-api";
import { formatEventRange } from "@/lib/format";
import styles from "./event-ticket.module.css";

export function EventTicket({
  event,
  children,
  actions,
}: {
  event: ManagedEventDetail;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const stages = ["DRAFT", "PUBLISHED", "COMPLETED"];
  const current = stages.indexOf(event.status);
  return (
    <div className={styles.shadow}>
      <section className={styles.ticket} aria-label="Event ticket desk">
        <div className={styles.main}>
          <div className={styles.meta}>
            <span>
              Admit <em>one</em> · Event no. {event.id.slice(0, 6)}
            </span>
            <span>
              Status: <em>{event.status}</em>
            </span>
          </div>
          <h1 data-ticket-title>{event.title}</h1>
          <dl className={styles.facts}>
            <div>
              <dt>When</dt>
              <dd>{formatEventRange(event.startAt, event.endAt)}</dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>
                {event.venue}
                <br />
                {event.city}, Bangladesh
              </dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{event.category}</dd>
            </div>
          </dl>
          {event.status === "CANCELLED" ? (
            <p className={styles.cancelled}>
              Event cancelled · retained for order and refund history
            </p>
          ) : (
            <ol className={styles.lifecycle} aria-label="Event lifecycle">
              {stages.map((stage, i) => (
                <li
                  key={stage}
                  data-state={
                    i === current ? "current" : i < current ? "done" : "future"
                  }
                  aria-current={i === current ? "step" : undefined}
                >
                  <span />
                  {stage}
                </li>
              ))}
            </ol>
          )}
          <div className={styles.actions}>{actions}</div>
        </div>
        <aside className={styles.stub}>{children}</aside>
      </section>
    </div>
  );
}

export function InventoryDots({
  capacity,
  sold,
  reserved,
}: {
  capacity: number;
  sold: number;
  reserved: number;
}) {
  const scale = Math.max(1, Math.ceil(capacity / 200));
  const available = Math.max(0, capacity - sold - reserved);
  return (
    <div
      className={styles.inventory}
      aria-label={`${capacity} capacity: ${sold} sold, ${reserved} reserved, ${available} available`}
    >
      <div className={styles.dots} aria-hidden="true">
        {[
          ["sold", sold],
          ["reserved", reserved],
          ["available", available],
        ].flatMap(([state, count]) =>
          Array.from({ length: Math.ceil(Number(count) / scale) }, (_, i) => (
            <i key={`${state}-${i}`} data-state={state} />
          )),
        )}
      </div>
      <div className={styles.key}>
        <span>
          <i data-state="sold" />
          {sold} sold
        </span>
        <span>
          <i data-state="reserved" />
          {reserved} reserved
        </span>
        <span>
          <i />
          {available} available
        </span>
      </div>
      <p className={styles.scale}>
        {scale === 1
          ? "One dot = one ticket"
          : `One dot = up to ${scale} tickets`}{" "}
        · Inventory overview, not assigned seats
      </p>
    </div>
  );
}
