"use client";
import { formatMoney } from "@/lib/format";
import { privateKey } from "@/lib/query-keys";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ReceiptText, RotateCcw } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { getRefunds, RefundApiError } from "@/lib/refund-api";

import styles from "./refunds.module.css";

const money = formatMoney;
const date = (value: string) =>
  new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));

export function RefundHistory() {
  const { isReady, session } = useAuth();
  const query = useQuery({
    queryKey: privateKey("refunds", session?.user.id, "list", {}),
    queryFn: () => getRefunds(),
    enabled: isReady && Boolean(session?.user.role === "ATTENDEE"),
    retry: false,
  });
  if (!isReady)
    return <p className={styles.loading}>Loading refund history…</p>;
  if (!session || session.user.role !== "ATTENDEE")
    return (
      <section className={styles.gate}>
        <RotateCcw size={29} aria-hidden="true" />
        <h1>Attendee access required.</h1>
        <p>Refund requests are private to the attendee who placed the order.</p>
        <Link className="button button-primary" href="/account">
          My account <ArrowRight size={16} />
        </Link>
      </section>
    );
  const refunds = query.data?.refunds ?? [];
  return (
    <div className={styles.history}>
      <header>
        <p className="eyebrow">
          <span /> Attendee account
        </p>
        <h1>
          Refund <b>history.</b>
        </h1>
        <p>
          See the status of every refund request submitted from your paid
          EventGate orders.
        </p>
      </header>
      {query.isLoading ? (
        <p className={styles.muted}>Loading requests…</p>
      ) : query.isError ? (
        <p className={styles.muted}>
          {query.error instanceof RefundApiError
            ? query.error.message
            : "Refund history could not be loaded."}
        </p>
      ) : refunds.length === 0 ? (
        <section className={styles.empty}>
          <ReceiptText size={28} aria-hidden="true" />
          <h2>No refund requests.</h2>
          <p>
            If an eligible paid order needs a refund, request it from that
            order’s receipt.
          </p>
          <Link className="button button-primary" href="/account">
            View orders <ArrowRight size={16} />
          </Link>
        </section>
      ) : (
        <div className={styles.list}>
          {refunds.map((refund) => (
            <article key={refund.id}>
              <div>
                <span className={styles.status}>{refund.status}</span>
                <h2>Order {refund.orderId.slice(0, 8).toUpperCase()}</h2>
                <p>Requested {date(refund.requestedAt)}</p>
                {refund.userMessage && (
                  <p>Your message: {refund.userMessage}</p>
                )}
                {refund.reviewerNote && <p>Review: {refund.reviewerNote}</p>}
                {refund.needsInvestigation && (
                  <p>
                    The payment provider outcome needs investigation. Support
                    must confirm it before another refund can be issued.
                  </p>
                )}
                {refund.activities.length > 0 && (
                  <details>
                    <summary>Review history</summary>
                    <ol>
                      {refund.activities.map((activity) => (
                        <li key={activity.id}>
                          {date(activity.createdAt)} ·{" "}
                          {activity.action.replaceAll("_", " ")}
                          {activity.note ? ` — ${activity.note}` : ""}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
                {refund.failureMessage && (
                  <p className={styles.failure}>{refund.failureMessage}</p>
                )}
              </div>
              <strong>{money(refund.amountPaisa)}</strong>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
