"use client";
import { useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { EventImage } from "@/components/event-image";
import { ReadFailure } from "@/components/read-failure";
import { getTicket, getTicketQr } from "@/lib/ticket-api";
import { privateKey } from "@/lib/query-keys";
import { formatEventRange, formatEventDate } from "@/lib/format";
import { admissionLabels, admissionExplanations } from "@/lib/ticket-status";
import styles from "./ticket-pass.module.css";
const subscribe = (callback: () => void) => {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
};
const visible = () => document.visibilityState === "visible";
export function TicketPass() {
  const { isReady, session } = useAuth();
  const { ticketId } = useParams<{ ticketId: string }>();
  const [requested, setRequested] = useState(false);
  const isVisible = useSyncExternalStore(subscribe, visible, () => false);
  const ticketQuery = useQuery({
    queryKey: privateKey("tickets", session?.user.id, ticketId, {}),
    queryFn: ({ signal }) => getTicket(ticketId, signal),
    enabled: isReady && session?.user.role === "ATTENDEE",
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchIntervalInBackground: false,
    refetchInterval: (query) => {
      const ticket = query.state.data;
      if (!ticket) return false;
      const now = Date.now();
      return now >= Date.parse(ticket.checkInWindow.opensAt) - 900000 &&
        now <= Date.parse(ticket.checkInWindow.closesAt)
        ? 15000
        : 60000;
    },
  });
  const eligible =
    !!ticketQuery.data?.canShowQr &&
    !ticketQuery.isFetching &&
    !ticketQuery.isError &&
    isVisible;
  const qrQuery = useQuery({
    queryKey: privateKey("tickets", session?.user.id, ticketId, { view: "qr" }),
    queryFn: ({ signal }) => getTicketQr(ticketId, signal),
    enabled: requested && eligible && session?.user.role === "ATTENDEE",
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: "always",
  });
  if (!isReady || ticketQuery.isLoading)
    return <p className={styles.loading}>Opening your pass…</p>;
  if (session?.user.role !== "ATTENDEE")
    return (
      <section className={styles.gate}>
        <h1>Attendee access required.</h1>
        <Link className="button" href="/account">
          My account
        </Link>
      </section>
    );
  if (ticketQuery.isError || !ticketQuery.data)
    return (
      <ReadFailure
        error={ticketQuery.error}
        retry={() => void ticketQuery.refetch()}
        fetching={ticketQuery.isFetching}
        next={`/tickets/${ticketId}`}
      />
    );
  const ticket = ticketQuery.data;
  const qr =
    eligible && !qrQuery.isFetching && !qrQuery.isError
      ? qrQuery.data?.dataUrl
      : null;
  return (
    <div>
      <div className={styles.pass}>
        <header>
          <p className="eyebrow">
            <span />
            Private attendee pass
          </p>
          <span className={styles.status}>
            {admissionLabels[ticket.effectiveAdmissionState]}
          </span>
        </header>
        <EventImage
          publicView
          src={ticket.event.imageUrl}
          title={ticket.event.title}
        />
        <section className={styles.body}>
          <div className={styles.details}>
            <h1>{ticket.event.title}</h1>
            <p className={styles.tier}>
              {ticket.ticketTier.name} · Pass #{ticket.sequence}
            </p>
            <p>
              {formatEventRange(ticket.event.startAt, ticket.event.endAt)}{" "}
              (Bangladesh time)
            </p>
            <p>
              {ticket.event.venue}, {ticket.event.city}
            </p>
            <p>
              Check-in:{" "}
              {formatEventRange(
                ticket.checkInWindow.opensAt,
                ticket.checkInWindow.closesAt,
              )}{" "}
              (Bangladesh time)
            </p>
            <p role="status">
              {admissionExplanations[ticket.effectiveAdmissionState]}
            </p>
            {ticket.checkedInAt && (
              <p>Admitted at {formatEventDate(ticket.checkedInAt)}.</p>
            )}
            <nav className={styles.actions}>
              <Link className="button" href={`/events/${ticket.event.slug}`}>
                Event details
              </Link>
              <Link className="button" href={`/orders/${ticket.orderId}`}>
                Order / refund
              </Link>
              <button
                type="button"
                className="button"
                disabled={ticketQuery.isFetching}
                onClick={() => void ticketQuery.refetch()}
              >
                Refresh pass
              </button>
            </nav>
          </div>
          <aside className={styles.qr}>
            {qr ? (
              <>
                <Image
                  alt={`Private QR for pass ${ticket.sequence}`}
                  src={qr}
                  width={240}
                  height={240}
                  unoptimized
                />
                <span>Present at entry</span>
              </>
            ) : (
              <>
                <strong>
                  {ticketQuery.isFetching
                    ? "Revalidating…"
                    : !ticket.canShowQr
                      ? ticket.effectiveAdmissionState === "ACTIVE"
                        ? "QR opens before check-in"
                        : admissionLabels[ticket.effectiveAdmissionState]
                      : qrQuery.isFetching
                        ? "Loading QR…"
                        : "QR stays private"}
                </strong>
                <p>
                  {!ticket.canShowQr &&
                  ticket.effectiveAdmissionState === "ACTIVE"
                    ? `Your booking is valid. Open your QR from ${formatEventDate(ticket.checkInWindow.opensAt)}. Entry starts at that time.`
                    : !ticket.canShowQr
                      ? admissionExplanations[ticket.effectiveAdmissionState]
                      : "Select Show private QR to display your entry code. Keep it private."}
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
            {eligible && requested && qrQuery.isError && (
              <button
                className="button"
                type="button"
                onClick={() => void qrQuery.refetch()}
              >
                Retry QR eligibility read
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
        </section>
        <footer>
          <span>
            Saved images never bypass server validation. Keep your QR private.
          </span>
          <span>Ticket #{ticket.id.slice(0, 8)}</span>
        </footer>
      </div>
      {qr && (
        <button className="button" type="button" onClick={() => window.print()}>
          Print this ticket
        </button>
      )}
      {ticket.effectiveAdmissionState === "REFUNDED" && (
        <p>
          This is a historical record of a refunded booking.{" "}
          <Link className="text-link" href="/events">
            Browse events for a new booking →
          </Link>
        </p>
      )}
    </div>
  );
}
