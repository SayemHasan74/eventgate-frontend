"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useAuth } from "./auth-provider";
import { ReadFailure } from "./read-failure";
import { getTickets, getTicketQr, type AttendeeTicket } from "@/lib/ticket-api";
import { privateKey } from "@/lib/query-keys";
import { formatBookingRange, formatEventDate } from "@/lib/format";
import { admissionLabels, admissionExplanations } from "@/lib/ticket-status";
import styles from "./booking-passes.module.css";
const subscribe = (callback: () => void) => {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
};
const visible = () => document.visibilityState === "visible";
export function AdmissionPass({
  ticket,
  refreshing,
  refresh,
}: {
  ticket: AttendeeTicket;
  refreshing: boolean;
  refresh: () => void;
}) {
  const { session } = useAuth();
  const [requested, setRequested] = useState(false);
  const article = useRef<HTMLElement>(null);
  const isVisible = useSyncExternalStore(subscribe, visible, () => false);
  const eligible = ticket.canShowQr && isVisible;
  const query = useQuery({
    queryKey: privateKey("tickets", session?.user.id, ticket.id, {
      view: "qr",
    }),
    queryFn: ({ signal }) => getTicketQr(ticket.id, signal),
    enabled: requested && eligible && session?.user.role === "ATTENDEE",
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const qr = eligible && !query.isError ? query.data?.dataUrl : null;
  const active = ticket.effectiveAdmissionState === "ACTIVE";
  return (
    <div className={styles.passShadow}>
      <article
        ref={article}
        className={styles.pass}
        aria-label={`Pass ${ticket.sequence}`}
      >
        <div className={styles.information}>
          <div className={styles.heading}>
            <h3>Pass {ticket.sequence}</h3>
            <span className={styles.stamp}>
              {admissionLabels[ticket.effectiveAdmissionState]}
            </span>
          </div>
          <p className={styles.tier}>{ticket.ticketTier.name}</p>
          <p>
            {ticket.event.venue}, {ticket.event.city}
          </p>
          <p>
            <b>Event:</b>{" "}
            {formatBookingRange(ticket.event.startAt, ticket.event.endAt)}
          </p>
          <p>
            <b>Check-in:</b>{" "}
            {formatBookingRange(
              ticket.checkInWindow.opensAt,
              ticket.checkInWindow.closesAt,
            )}
          </p>
          <p role="status">
            {admissionExplanations[ticket.effectiveAdmissionState]}
          </p>
          {ticket.checkedInAt && (
            <p>Admitted {formatEventDate(ticket.checkedInAt)}.</p>
          )}
          <span className={styles.reference}>
            Ticket #{ticket.id.slice(0, 8).toUpperCase()}
          </span>
          <div className={styles.actions}>
            <button
              type="button"
              className="button"
              disabled={refreshing}
              onClick={refresh}
            >
              {refreshing ? "Refreshing…" : "Refresh pass"}
            </button>
            {qr && (
              <button
                type="button"
                className="button"
                onClick={() => {
                  document.documentElement.dataset.printTicket = ticket.id;
                  article.current?.setAttribute("data-printing", "true");
                  try {
                    window.print();
                  } finally {
                    delete document.documentElement.dataset.printTicket;
                    article.current?.removeAttribute("data-printing");
                  }
                }}
              >
                Print this ticket
              </button>
            )}
          </div>
        </div>
        <aside
          className={styles.qr}
          aria-label={`QR for pass ${ticket.sequence}`}
        >
          {qr ? (
            <Image
              src={qr}
              alt={`Private QR for pass ${ticket.sequence}`}
              width={180}
              height={180}
              unoptimized
            />
          ) : (
            <>
              <b>
                {refreshing
                  ? "Checking pass…"
                  : !ticket.canShowQr
                    ? active
                      ? "QR opens before check-in"
                      : admissionLabels[ticket.effectiveAdmissionState]
                    : query.isFetching
                      ? "Loading QR…"
                      : "Private entry QR"}
              </b>
              <p>
                {!ticket.canShowQr && active
                  ? `Available from ${formatEventDate(ticket.checkInWindow.opensAt)}.`
                  : ticket.canShowQr
                    ? "Show your code at the gate. Each pass admits one guest once."
                    : admissionExplanations[ticket.effectiveAdmissionState]}
              </p>
            </>
          )}
          {eligible && !requested && (
            <button
              className="button button-primary"
              type="button"
              onClick={() => setRequested(true)}
            >
              Show private QR
            </button>
          )}
          {eligible && requested && query.isError && (
            <button
              className="button"
              type="button"
              onClick={() => void query.refetch()}
            >
              Retry QR
            </button>
          )}
          {qr && (
            <a
              className="button"
              href={qr}
              download={`eventgate-pass-${ticket.sequence}.png`}
            >
              Download QR PNG
            </a>
          )}
        </aside>
      </article>
    </div>
  );
}
export function BookingPasses({ orderId }: { orderId: string }) {
  const { session, isReady } = useAuth();
  const query = useQuery({
    queryKey: privateKey("tickets", session?.user.id, "order-passes", {
      orderId,
    }),
    queryFn: () =>
      getTickets(new URLSearchParams({ orderId, period: "all", limit: "10" })),
    enabled: isReady && session?.user.role === "ATTENDEE",
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchInterval: (query) =>
      query.state.data?.data.some((ticket) => ticket.canShowQr) ? 15000 : 60000,
    refetchIntervalInBackground: false,
  });
  if (query.isError)
    return (
      <ReadFailure
        error={query.error}
        retry={() => void query.refetch()}
        fetching={query.isFetching}
        next={`/orders/${orderId}`}
      />
    );
  if (!query.data) return <p role="status">Loading your passes…</p>;
  return (
    <section
      id="passes"
      className={styles.list}
      aria-label="Your purchased passes"
    >
      <h2>Your passes</h2>
      {[...query.data.data]
        .sort((a, b) => a.sequence - b.sequence)
        .map((ticket) => (
          <AdmissionPass
            key={ticket.id}
            ticket={ticket}
            refreshing={query.isFetching}
            refresh={() => void query.refetch()}
          />
        ))}
      {!query.data.data.length && (
        <p>
          Your payment is recorded. Passes are being issued; refresh this
          booking shortly. Do not pay again.
        </p>
      )}
    </section>
  );
}
