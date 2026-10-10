"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ReceiptText, RotateCcw } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { getRefunds, RefundApiError } from "@/lib/refund-api";

import styles from "./refunds.module.css";

const money = (paisa: number) => `৳${new Intl.NumberFormat("en-BD").format(paisa / 100)}`;
const date = (value: string) => new Intl.DateTimeFormat("en-BD", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(value));

export function RefundHistory() {
  const { isReady, session } = useAuth();
  const query = useQuery({ queryKey: ["refunds", session?.accessToken], queryFn: () => getRefunds(session!.accessToken), enabled: isReady && Boolean(session?.user.role === "ATTENDEE"), retry: false });
  if (!isReady) return <p className={styles.loading}>Loading refund history…</p>;
  if (!session || session.user.role !== "ATTENDEE") return <section className={styles.gate}><RotateCcw size={29} aria-hidden="true" /><h1>Attendee access required.</h1><p>Refund requests are private to the attendee who placed the order.</p><Link className="button button-primary" href="/account">My account <ArrowRight size={16} /></Link></section>;
  const refunds = query.data?.refunds ?? [];
  return <div className={styles.history}><header><p className="eyebrow"><span /> Attendee account</p><h1>Refund <b>history.</b></h1><p>See the status of every refund request submitted from your paid EventGate orders.</p></header>{query.isLoading ? <p className={styles.muted}>Loading requests…</p> : query.isError ? <p className={styles.muted}>{query.error instanceof RefundApiError ? query.error.message : "Refund history could not be loaded."}</p> : refunds.length === 0 ? <section className={styles.empty}><ReceiptText size={28} aria-hidden="true" /><h2>No refund requests.</h2><p>If an eligible paid order needs a refund, request it from that order’s receipt.</p><Link className="button button-primary" href="/account">View orders <ArrowRight size={16} /></Link></section> : <div className={styles.list}>{refunds.map((refund) => <article key={refund.id}><div><span className={styles.status}>{refund.status}</span><h2>Order {refund.orderId.slice(0, 8).toUpperCase()}</h2><p>Requested {date(refund.requestedAt)}</p>{refund.failureMessage && <p className={styles.failure}>{refund.failureMessage}</p>}</div><strong>{money(refund.amountPaisa)}</strong></article>)}</div>}</div>;
}
