"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock3, LoaderCircle, LogIn, ReceiptText } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { getOrder, OrderApiError } from "@/lib/order-api";

import { CheckoutPanel } from "./checkout-panel";
import { RefundAction } from "./refund-action";
import styles from "./order-status.module.css";

type OrderStatusProps = Readonly<{ orderId: string }>;

const money = (paisa: number) => `৳${new Intl.NumberFormat("en-BD").format(paisa / 100)}`;

export function OrderStatus({ orderId }: OrderStatusProps) {
  const { isReady, session } = useAuth();
  const query = useQuery({
    queryKey: ["order", orderId, session?.accessToken],
    queryFn: () => getOrder(session!.accessToken, orderId),
    enabled: isReady && Boolean(session),
    retry: false,
  });

  if (!isReady || (session && query.isLoading)) return <div className={styles.loading}><LoaderCircle className={styles.spinner} size={26} /> Loading your reservation…</div>;

  if (!session) return (
    <section className={styles.notice}>
      <LogIn size={27} aria-hidden="true" /><h1>Sign in to see this reservation.</h1><p>Reservations are private to the attendee who created them.</p>
      <Link className="button button-primary" href={`/auth/sign-in?next=${encodeURIComponent(`/orders/${orderId}`)}`}>Sign in <ArrowRight size={16} /></Link>
    </section>
  );

  if (query.isError || !query.data) return (
    <section className={styles.notice}>
      <ReceiptText size={27} aria-hidden="true" /><h1>We could not open this reservation.</h1><p>{query.error instanceof OrderApiError ? query.error.message : "Please try again from your orders."}</p>
      <Link className="button button-primary" href="/events">Browse events <ArrowRight size={16} /></Link>
    </section>
  );

  const order = query.data;
  const expires = order.reservationExpiresAt
    ? new Intl.DateTimeFormat("en-BD", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(order.reservationExpiresAt))
    : null;

  return (
    <>
    <div className={styles.receipt}>
      <header className={styles.receiptHeader}><span>Reservation receipt</span><b>{order.status.replaceAll("_", " ")}</b></header>
      <div className={styles.content}>
        <p className="eyebrow"><span /> Tickets are held</p>
        <h1>{order.eventNameSnapshot}</h1>
        <div className={styles.lineItem}><div><strong>{order.ticketTierNameSnapshot}</strong><span>{order.quantity} {order.quantity === 1 ? "ticket" : "tickets"} × {money(order.unitPricePaisaSnapshot)}</span></div><b>{money(order.totalAmountPaisaSnapshot)}</b></div>
        {order.status === "PENDING_PAYMENT" && expires && <p className={styles.expiry}><Clock3 size={16} aria-hidden="true" /> Held until {expires} (Bangladesh time).</p>}
      </div>
      <footer className={styles.receiptFooter}><span>Reservation #{order.id.slice(0, 8).toUpperCase()}</span><span>EventGate secure reservation</span></footer>
    </div>
    <CheckoutPanel orderId={order.id} payable={order.status === "PENDING_PAYMENT" && Boolean(order.reservationExpiresAt)} />
    <RefundAction orderId={order.id} status={order.status} />
    </>
  );
}
