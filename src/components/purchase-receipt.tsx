"use client";
import { useEffect } from "react";
import type { OrderDetail } from "@/lib/order-api";
import { formatMoney, formatEventDate } from "@/lib/format";
import styles from "./purchase-receipt.module.css";
export function PurchaseReceipt({ order }: { order: OrderDetail }) {
  useEffect(() => {
    if (window.location.hash === "#purchase-receipt")
      document.getElementById("purchase-receipt")?.scrollIntoView();
  }, [order.id]);
  if (
    !["PAID", "REFUNDED"].includes(order.status) ||
    !order.fulfilledPaymentAttemptId
  )
    return null;
  const payment = order.paymentAttempts.find(
    (attempt) => attempt.id === order.fulfilledPaymentAttemptId,
  );
  return (
    <section id="purchase-receipt">
      <button className="button" type="button" onClick={() => window.print()}>
        Print purchase receipt
      </button>
      <article className={styles.receipt} aria-label="Purchase receipt">
        <h2>EventGate purchase receipt</h2>
        <p>This is a purchase record, not a tax invoice.</p>
        <dl>
          <dt>Order</dt>
          <dd>{order.id}</dd>
          <dt>Booking date</dt>
          <dd>{formatEventDate(order.createdAt)} (Bangladesh time)</dd>
          <dt>Event (at purchase)</dt>
          <dd>{order.eventNameSnapshot}</dd>
          <dt>Ticket tier (at purchase)</dt>
          <dd>{order.ticketTierNameSnapshot}</dd>
          <dt>Quantity</dt>
          <dd>{order.quantity}</dd>
          <dt>Unit price</dt>
          <dd>{formatMoney(order.unitPricePaisaSnapshot)}</dd>
          <dt>Total charged</dt>
          <dd>
            {formatMoney(order.totalAmountPaisaSnapshot)} {order.currency}
          </dd>
          <dt>Payment provider</dt>
          <dd>SSLCommerz</dd>
          {payment && (
            <>
              <dt>Payment reference</dt>
              <dd>{payment.merchantTransactionId}</dd>
            </>
          )}
          <dt>Order status</dt>
          <dd>{order.status}</dd>
          {order.paidAt && (
            <>
              <dt>Payment confirmed</dt>
              <dd>{formatEventDate(order.paidAt)} (Bangladesh time)</dd>
            </>
          )}
          {order.refundedAt && (
            <>
              <dt>Refund confirmed</dt>
              <dd>{formatEventDate(order.refundedAt)} (Bangladesh time)</dd>
            </>
          )}
        </dl>
        <p>
          This receipt covers this booking only. Additional ticket purchases
          have their own receipt and payment.
        </p>
      </article>
    </section>
  );
}
