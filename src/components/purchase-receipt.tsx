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
    <section id="purchase-receipt" className={styles.wrapper}>
      <article className={styles.receipt} aria-label="Purchase receipt">
        <header>
          <b>EventGate</b>
          <h2>Purchase receipt</h2>
          <span>{formatEventDate(order.paidAt ?? order.createdAt, false)}</span>
        </header>
        <div className={styles.item}>
          <h3>{order.eventNameSnapshot}</h3>
          <p>
            {order.ticketTierNameSnapshot} × {order.quantity}
          </p>
          <p>{formatMoney(order.unitPricePaisaSnapshot)} each</p>
        </div>
        <div className={styles.total}>
          <span>Total charged</span>
          <b>{formatMoney(order.totalAmountPaisaSnapshot)}</b>
        </div>
        <div className={styles.state} data-status={order.status}>
          <span>{order.status}</span>
        </div>
        <dl>
          <dt>Booking</dt>
          <dd>#{order.id.slice(0, 8).toUpperCase()}</dd>
          <dt>Payment provider</dt>
          <dd>SSLCommerz</dd>
          {payment && (
            <>
              <dt>Payment reference</dt>
              <dd>{payment.merchantTransactionId}</dd>
            </>
          )}
          {order.paidAt && (
            <>
              <dt>Paid</dt>
              <dd>{formatEventDate(order.paidAt)}</dd>
            </>
          )}
          {order.refundedAt && (
            <>
              <dt>Refunded</dt>
              <dd>{formatEventDate(order.refundedAt)}</dd>
            </>
          )}
        </dl>
        <footer>
          This receipt covers this booking only.
          <br />
          Purchase record · not a tax invoice
        </footer>
      </article>
      <button
        className="button"
        type="button"
        onClick={() => {
          document.documentElement.dataset.printReceipt = order.id;
          try {
            window.print();
          } finally {
            delete document.documentElement.dataset.printReceipt;
          }
        }}
      >
        Print purchase receipt
      </button>
    </section>
  );
}
