"use client";
import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Clock3, LoaderCircle, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { getOrder, cancelOrder } from "@/lib/order-api";
import { ReadFailure } from "@/components/read-failure";
import { BookingPasses } from "@/components/booking-passes";
import { PurchaseReceipt } from "@/components/purchase-receipt";
import { formatMoney, formatEventDate, formatBookingRange } from "@/lib/format";
import { privateKey, invalidateMutation } from "@/lib/query-keys";
import { useReservationClock } from "@/lib/reservation-clock";
import { CheckoutPanel } from "./checkout-panel";
import { RefundAction } from "./refund-action";
import styles from "./order-status.module.css";

export function OrderStatus({ orderId }: { orderId: string }) {
  const { isReady, session } = useAuth();
  const client = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: privateKey("orders", session?.user.id, orderId, {}),
    queryFn: () => getOrder(orderId),
    enabled: isReady && session?.user.role === "ATTENDEE",
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const refetch = query.refetch;
  const refresh = useCallback(() => {
    if (session?.user.role === "ATTENDEE") void refetch();
  }, [session?.user.role, refetch]);
  const order = query.data;
  const pending = order?.status === "PENDING_PAYMENT";
  const remaining = useReservationClock(
    order?.serverTime,
    order?.reservationExpiresAt,
    pending,
    refresh,
  );
  const cancel = async () => {
    if (!order?.cancellable || !session || cancelling) return;
    if (
      !window.confirm(
        "Cancel this reservation and release its tickets? If a payment arrives later, its verified outcome and refund status will still be tracked.",
      )
    )
      return;
    setCancelling(true);
    setError("");
    try {
      await cancelOrder(order.id);
      await invalidateMutation(client, session.user.id, "order");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Cancellation could not be confirmed. Refresh the order before retrying.",
      );
    } finally {
      setCancelling(false);
    }
  };
  if (!isReady || (session && query.isLoading))
    return (
      <div className={styles.loading}>
        <LoaderCircle className={styles.spinner} size={26} /> Loading your
        reservation…
      </div>
    );
  if (!session)
    return (
      <section className={styles.notice}>
        <h1>Sign in to view this order.</h1>
        <Link
          className="button button-primary"
          href={`/auth/sign-in?next=${encodeURIComponent("/orders/" + orderId)}`}
        >
          Sign in
        </Link>
      </section>
    );
  if (query.isError || !order)
    return (
      <section className={styles.notice}>
        <ReceiptText size={27} />
        <h1>We could not open this order.</h1>
        <ReadFailure
          error={query.error}
          retry={refresh}
          fetching={query.isFetching}
          next={`/orders/${orderId}`}
        />
        <button
          className="button"
          type="button"
          disabled={query.isFetching}
          onClick={refresh}
        >
          Retry
        </button>
        <Link className="button" href="/orders">
          Order history
        </Link>
      </section>
    );
  const payable = order.payable && remaining !== null && remaining > 0;
  const expired = pending && remaining === 0;
  const seconds = remaining === null ? null : Math.ceil(remaining / 1000);
  const timer =
    seconds === null
      ? "Syncing reservation clock…"
      : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const labels: Record<string, string> = {
    PAID: "Payment confirmed",
    CANCELLED: "Reservation cancelled",
    EXPIRED: "Reservation expired",
    REFUNDED: "Booking refunded",
  };
  const heading = expired
    ? "Reservation time elapsed"
    : pending
      ? order.payable
        ? "Reserved while payment is pending"
        : "Awaiting order and payment verification"
      : (labels[order.status] ?? "Order status");
  const canBuyMore =
    order.event.status === "PUBLISHED" &&
    !order.event.deletedAt &&
    Date.parse(order.event.startAt) > Date.parse(order.serverTime);
  const purchaseAction = canBuyMore ? (
    <Link
      className="button button-primary"
      href={`/events/${order.event.slug}/tickets?tierId=${order.ticketTierId}`}
    >
      Buy more tickets
    </Link>
  ) : (
    <button
      className="button"
      type="button"
      disabled
      aria-describedby="sales-closed"
    >
      Buy more tickets
    </button>
  );
  return (
    <div className={styles.booking}>
      <section className={styles.overview} aria-label="Booking summary">
        <header className={styles.receiptHeader}>
          <span className={styles.brand}>EventGate</span>
          <span className={styles.stamp} data-status={order.status}>
            {order.status.replaceAll("_", " ")}
          </span>
        </header>
        <div className={styles.content}>
          <p className="eyebrow">
            <span />
            {heading}
          </p>
          <h1>{order.eventNameSnapshot}</h1>
          <div className={styles.facts}>
            <div>
              <span>When</span>
              <p>
                {order.event.endAt
                  ? formatBookingRange(order.event.startAt, order.event.endAt)
                  : formatEventDate(order.event.startAt)}
              </p>
            </div>
            {order.event.venue && (
              <div>
                <span>Where</span>
                <p>
                  {order.event.venue}, {order.event.city}
                </p>
              </div>
            )}
            <div>
              <span>Your booking</span>
              <p>
                {order.quantity} × {order.ticketTierNameSnapshot}
              </p>
            </div>
            <div>
              <span>{order.paidAt ? "Amount paid" : "Total to pay"}</span>
              <p className={styles.amount}>
                {formatMoney(order.totalAmountPaisaSnapshot)}
              </p>
            </div>
          </div>
          {pending && (
            <div className={styles.expiry}>
              <Clock3 size={18} />
              <div>
                <strong>{timer}</strong>
                <p>
                  {expired
                    ? "The reservation time has elapsed. Refresh to confirm the outcome before rebooking."
                    : order.payable
                      ? "Complete checkout before your reservation expires."
                      : "Payment is being verified. Do not pay again while its outcome is uncertain."}
                </p>
              </div>
            </div>
          )}
          {order.financialReviewRequired && (
            <p role="status">
              This booking needs financial review. Do not pay again while its
              outcome is uncertain.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <RefundAction order={order} purchaseAction={purchaseAction} />
          {["PAID", "REFUNDED"].includes(order.status) && (
            <p className={styles.hint} id="sales-closed">
              {canBuyMore
                ? "Additional tickets create a separate booking. You pay only for the new quantity."
                : "Ticket sales are closed for this event. Your booking and receipt remain available here."}
            </p>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              className="button"
              disabled={query.isFetching}
              onClick={refresh}
            >
              {query.isFetching ? "Refreshing…" : "Refresh booking"}
            </button>
            {order.cancellable && (
              <button
                className="button"
                disabled={cancelling}
                type="button"
                onClick={() => void cancel()}
              >
                {cancelling ? "Cancelling…" : "Cancel reservation"}
              </button>
            )}
            {(expired || ["EXPIRED", "CANCELLED"].includes(order.status)) &&
              canBuyMore && (
                <Link
                  className="button"
                  href={`/events/${order.event.slug}/tickets?tierId=${order.ticketTierId}`}
                >
                  Choose new tickets <ArrowRight size={16} />
                </Link>
              )}
            {!order.event.deletedAt && (
              <Link className="text-link" href={`/events/${order.event.slug}`}>
                Event details →
              </Link>
            )}
          </div>
        </div>
        <footer className={styles.receiptFooter}>
          <span>Booking #{order.id.slice(0, 8).toUpperCase()}</span>
          <Link href="/orders">All orders →</Link>
        </footer>
      </section>
      {pending && (
        <CheckoutPanel key={order.id} order={order} payable={payable} />
      )}
      <div className={styles.detailsGrid}>
        {order.ticketIds.length > 0 && <BookingPasses orderId={order.id} />}
        <PurchaseReceipt order={order} />
      </div>
      {order.paymentAttempts.length > 0 && (
        <details className={styles.activity}>
          <summary>Payment activity</summary>
          <ul>
            {order.paymentAttempts.map((attempt) => (
              <li key={attempt.id}>
                {attempt.status.replaceAll("_", " ")} ·{" "}
                {formatMoney(attempt.amountPaisa)} ·{" "}
                {formatEventDate(attempt.initiatedAt)}
              </li>
            ))}
          </ul>
          <Link className="text-link" href="/payment/status">
            Payment help →
          </Link>
        </details>
      )}
    </div>
  );
}
