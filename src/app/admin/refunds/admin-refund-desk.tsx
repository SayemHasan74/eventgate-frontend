"use client";
import { invalidatePrivate, privateKey } from "@/lib/query-keys";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CircleAlert, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import {
  AdminRefundApiError,
  getAdminRefunds,
  retryAdminRefund,
  reviewAdminRefund,
} from "@/lib/admin-refund-api";

import styles from "./admin-refunds.module.css";

const money = (paisa: number) =>
  `৳${new Intl.NumberFormat("en-BD").format(paisa / 100)}`;
const date = (value: string) =>
  new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));

export function AdminRefundDesk() {
  const { isReady, session } = useAuth();
  const client = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const allowed = session?.user.role === "ADMIN";
  const query = useQuery({
    queryKey: privateKey("admin-refunds", session?.user.id, "list", {}),
    queryFn: () => getAdminRefunds(),
    enabled: isReady && allowed,
    retry: false,
  });
  const update = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: "approve" | "reject";
    }) => reviewAdminRefund(id, decision, notes[id]),
    onSuccess: () =>
      invalidatePrivate(client, session!.user.id, [
        "admin-refunds",
        "admin-stats",
        "admin-operations",
        "admin-audit",
      ]),
  });
  const retry = useMutation({
    mutationFn: (id: string) => retryAdminRefund(id),
    onSuccess: () =>
      invalidatePrivate(client, session!.user.id, [
        "admin-refunds",
        "admin-stats",
        "admin-operations",
        "admin-audit",
      ]),
  });

  if (!isReady)
    return <p className={styles.loading}>Loading refund operations…</p>;
  if (!session || !allowed)
    return (
      <section className={styles.gate}>
        <ShieldCheck size={30} aria-hidden="true" />
        <h1>Admin access required.</h1>
        <p>Refund review is limited to platform administrators.</p>
        <Link className="button button-primary" href="/account">
          My account <ArrowRight size={16} />
        </Link>
      </section>
    );
  const error = update.error ?? retry.error ?? query.error;
  const refunds = query.data?.refunds ?? [];
  return (
    <div className={styles.desk}>
      <header>
        <p className="eyebrow">
          <span /> Platform operations
        </p>
        <h1>
          Refund <b>desk.</b>
        </h1>
        <p>
          Review attendee requests and follow provider refund processing from
          one controlled queue.
        </p>
      </header>
      <section className={styles.summary}>
        <div>
          <span>All requests</span>
          <strong>{query.data?.total ?? 0}</strong>
        </div>
        <div>
          <span>Needs review</span>
          <strong>
            {refunds.filter((refund) => refund.status === "REQUESTED").length}
          </strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>
            {refunds.filter((refund) => refund.status === "SUCCEEDED").length}
          </strong>
        </div>
      </section>
      {error && (
        <p className={styles.error}>
          <CircleAlert size={16} />{" "}
          {error instanceof AdminRefundApiError
            ? error.message
            : "Refund operations could not be completed."}
        </p>
      )}
      {query.isLoading ? (
        <p className={styles.muted}>Loading requests…</p>
      ) : query.isError ? null : refunds.length === 0 ? (
        <section className={styles.empty}>
          <ShieldCheck size={29} aria-hidden="true" />
          <h2>Nothing to review.</h2>
          <p>New attendee refund requests will appear here.</p>
        </section>
      ) : (
        <div className={styles.list}>
          {refunds.map((refund) => (
            <article key={refund.id}>
              <div className={styles.details}>
                <span className={styles.status}>
                  {refund.status.replaceAll("_", " ")}
                </span>
                <h2>Order {refund.orderId.slice(0, 8).toUpperCase()}</h2>
                <p>
                  Requested {date(refund.requestedAt)} ·{" "}
                  {refund.reason.replaceAll("_", " ")}
                </p>
                {refund.failureMessage && (
                  <p className={styles.failure}>{refund.failureMessage}</p>
                )}
                {refund.userMessage && <p>Attendee: {refund.userMessage}</p>}
                {refund.reviewerNote && <p>Review: {refund.reviewerNote}</p>}
                {refund.needsInvestigation && (
                  <p className={styles.failure}>
                    Manual investigation required. Confirm this capture and its
                    refund in the merchant portal. Do not initiate another
                    refund.
                  </p>
                )}
                {refund.activities.length > 0 && (
                  <details>
                    <summary>Request and review history</summary>
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
              </div>
              <div className={styles.actions}>
                <strong>{money(refund.amountPaisa)}</strong>
                {refund.status === "REQUESTED" &&
                  !refund.needsInvestigation && (
                    <div>
                      <label>
                        Review note (required to reject)
                        <textarea
                          rows={3}
                          maxLength={1000}
                          value={notes[refund.id] ?? ""}
                          onChange={(event) =>
                            setNotes((current) => ({
                              ...current,
                              [refund.id]: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="button button-primary"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({ id: refund.id, decision: "approve" })
                        }
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={styles.reject}
                        disabled={update.isPending || !notes[refund.id]?.trim()}
                        onClick={() =>
                          update.mutate({ id: refund.id, decision: "reject" })
                        }
                      >
                        Reject
                      </button>
                    </div>
                  )}
                {refund.status === "FAILED" &&
                  !refund.needsInvestigation &&
                  [
                    "PROVIDER_REFUND_REJECTED",
                    "PROVIDER_REFUND_CONFIRMED_FAILED",
                  ].includes(refund.failureCode ?? "") && (
                    <button
                      type="button"
                      className={styles.retry}
                      disabled={retry.isPending}
                      onClick={() => retry.mutate(refund.id)}
                    >
                      <RefreshCw size={15} /> Retry provider
                    </button>
                  )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
