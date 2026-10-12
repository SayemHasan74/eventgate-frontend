"use client";
import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Clock3, LoaderCircle, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { getOrder, cancelOrder } from "@/lib/order-api";
import { ReadFailure } from "@/components/read-failure";
import { PurchaseReceipt } from "@/components/purchase-receipt";
import { formatMoney, formatEventDate } from "@/lib/format";
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
    refetchOnWindowFocus: false,
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
  return (
    <>
      <div className={styles.receipt}>
        <header className={styles.receiptHeader}>
          <span>Order receipt</span>
          <b>{order.status.replaceAll("_", " ")}</b>
        </header>
        <div className={styles.content}>
          <p className="eyebrow">
            <span />
            {heading}
          </p>
          <h1>{order.eventNameSnapshot}</h1>
          <p>
            Current event status:{" "}
            <strong>{order.event.status.replaceAll("_", " ")}</strong> ·{" "}
            <Link href={`/events/${order.event.slug}`}>Event details</Link>
          </p>
          {order.paidAt && (
            <p>Paid at {formatEventDate(order.paidAt)} (Bangladesh time).</p>
          )}
          {order.refundedAt && (
            <p>
              Refunded at {formatEventDate(order.refundedAt)} (Bangladesh time).
            </p>
          )}
          <div className={styles.lineItem}>
            <div>
              <strong>{order.ticketTierNameSnapshot}</strong>
              <span>
                {order.quantity} {order.quantity === 1 ? "ticket" : "tickets"} ×{" "}
                {formatMoney(order.unitPricePaisaSnapshot)}
              </span>
            </div>
            <b>{formatMoney(order.totalAmountPaisaSnapshot)}</b>
          </div>
          {pending && (
            <div className={styles.expiry}>
              <Clock3 size={16} />
              <div>
                <strong>{timer}</strong>
                <p>
                  Reservation deadline:{" "}
                  {order.reservationExpiresAt
                    ? formatEventDate(order.reservationExpiresAt)
                    : "Unavailable"}{" "}
                  (Bangladesh time).
                </p>
                <p>
                  The clock is guidance; the server authorizes payment.{" "}
                  {expired
                    ? "New checkout is disabled. Refresh to confirm the latest order and payment outcome."
                    : !order.payable
                      ? "This order is not currently eligible for a new checkout."
                      : "Complete payment before the hold expires."}
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
          <div className={styles.actions}>
            <button
              type="button"
              className="button"
              disabled={query.isFetching}
              onClick={refresh}
            >
              {query.isFetching ? "Refreshing…" : "Refresh order"}
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
            {(expired || ["EXPIRED", "CANCELLED"].includes(order.status)) && (
              <Link
                className="button"
                href={`/events/${order.event.slug}/tickets`}
              >
                Review tickets and rebook <ArrowRight size={16} />
              </Link>
            )}
          </div>
          {order.status === "PAID" && (
            <section>
              <h2>Your issued tickets</h2>
              {order.ticketIds.length ? (
                <div className={styles.actions}>
                  {order.ticketIds.map((id, index) => (
                    <Link
                      className="button button-primary"
                      key={id}
                      href={`/tickets/${id}`}
                    >
                      Open pass {index + 1} →
                    </Link>
                  ))}
                </div>
              ) : (
                <p>
                  Tickets are still being issued. Refresh this order; do not
                  make another payment.
                </p>
              )}
            </section>
          )}
        </div>
        <footer className={styles.receiptFooter}>
          <span>Order #{order.id.slice(0, 8).toUpperCase()}</span>
          <Link href="/orders">All orders</Link>
        </footer>
      </div>
      <CheckoutPanel key={order.id} order={order} payable={payable} />
      <section className={styles.receipt}>
        <div className={styles.content}>
          <h2>Payment attempt history</h2>
          {order.paymentAttempts.length ? (
            <ul>
              {order.paymentAttempts.map((attempt) => (
                <li key={attempt.id}>
                  Attempt #{attempt.id.slice(0, 8)} · {attempt.status} ·{" "}
                  {formatMoney(attempt.amountPaisa)} · Started{" "}
                  {formatEventDate(attempt.initiatedAt)}
                  {attempt.completedAt
                    ? ` · Completed ${formatEventDate(attempt.completedAt)}`
                    : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p>No payment attempt has been started.</p>
          )}
          <Link className="text-link" href={`/payment/status`}>
            Payment recovery guidance →
          </Link>
          <PurchaseReceipt order={order} />
        </div>
      </section>
      <RefundAction order={order} />
    </>
  );
}
