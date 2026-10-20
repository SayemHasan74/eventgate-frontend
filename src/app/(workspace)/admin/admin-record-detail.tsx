"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { apiClient, jsonBody } from "@/lib/api-client";
import { privateKey, invalidateMutation } from "@/lib/query-keys";
import {
  getAdminUser,
  getAdminPayment,
  getAdminRefund,
  getAdminOrder,
  getAdminAudit,
  adminRecordLink,
  requestReconciliation,
  adminUserSchema,
} from "@/lib/admin-workflow-api";
import { getManagedEvent, type ManagedEventDetail } from "@/lib/organizer-api";
import { formatMoney, formatEventDate, formatEventRange } from "@/lib/format";
import { Button, DataTable, Skeleton, StatusBadge } from "@/components/ui";
import { ErrorState } from "@/components/ui/interactive";
import { AdminAction } from "@/components/admin-action";
import { UserChangeDialog, type UserCommand } from "./users/user-change-dialog";
import { RefundOperations } from "./refunds/admin-refund-desk";
import styles from "./admin-workflows.module.css";
type Kind =
  "users" | "events" | "payments" | "refunds" | "orders" | "audit-logs";
function DetailPanel<T>({
  kind,
  read,
  children,
}: {
  kind: Kind;
  read: (id: string) => Promise<T>;
  children: (data: T) => ReactNode;
}) {
  const { recordId } = useParams<{ recordId: string }>();
  const { session } = useAuth();
  const query = useQuery({
    queryKey: privateKey(`admin-${kind}`, session?.user.id, recordId, {}),
    queryFn: () => read(recordId),
    enabled: session?.user.role === "ADMIN",
    retry: false,
  });
  return (
    <section className={styles.page}>
      <Link href={kind === "orders" ? "/admin/payments" : `/admin/${kind}`}>
        Back to {kind === "orders" ? "payments" : kind.replaceAll("-", " ")}
      </Link>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        children(query.data)
      )}
    </section>
  );
}
export function AdminRecordDetail({ kind }: { kind: Kind }) {
  if (kind === "users")
    return (
      <DetailPanel kind={kind} read={getAdminUser}>
        {(user) => (
          <>
            <h1>{user.displayName}</h1>
            <StatusBadge status={user.status} />
            <dl className={styles.facts}>
              <dt>Email</dt>
              <dd>{user.email}</dd>
              <dt>Role</dt>
              <dd>{user.role}</dd>
              <dt>Registered</dt>
              <dd>{formatEventDate(user.createdAt)}</dd>
              <dt>Organized events</dt>
              <dd>{user._count.organizedEvents}</dd>
              <dt>Orders / passes</dt>
              <dd>
                {user._count.orders} / {user._count.tickets}
              </dd>
            </dl>
            <UserDetailActions user={user} />
            <Link href={`/admin/events?organizerId=${user.id}`}>
              Organized events
            </Link>
            <AuditLink type="USER" id={user.id} />
          </>
        )}
      </DetailPanel>
    );
  if (kind === "events")
    return (
      <DetailPanel kind={kind} read={(id) => getManagedEvent(id, true)}>
        {(event) => <EventDetail event={event} />}
      </DetailPanel>
    );
  if (kind === "payments")
    return (
      <DetailPanel kind={kind} read={getAdminPayment}>
        {(payment) => (
          <>
            <h1>Payment verification record</h1>
            {payment.failureMessage && (
              <p role="status">
                {payment.failureCode ?? "Verification issue"}:{" "}
                {payment.failureMessage}
              </p>
            )}
            <StatusBadge status={payment.status} />
            <dl className={styles.facts}>
              <dt>Merchant reference</dt>
              <dd>{payment.merchantTransactionId}</dd>
              <dt>Amount</dt>
              <dd>{formatMoney(payment.amountPaisa)}</dd>
              <dt>Capture identity</dt>
              <dd>
                {payment.replayOfAttemptId
                  ? "Replay of an existing capture"
                  : payment.id === payment.order.fulfilledPaymentAttemptId
                    ? "Canonical fulfilled purchase"
                    : payment.status === "SUCCEEDED"
                      ? "Non-canonical capture — inspect refund state"
                      : "No confirmed canonical fulfillment"}
              </dd>
              <dt>Provider transaction reference</dt>
              <dd>{payment.providerTransactionId ?? "Not confirmed"}</dd>
              <dt>Initiated / completed</dt>
              <dd>
                {formatEventDate(payment.initiatedAt)} /{" "}
                {payment.completedAt
                  ? formatEventDate(payment.completedAt)
                  : "Not recorded"}
              </dd>
            </dl>
            <div className={styles.actions}>
              <Link href={`/admin/orders/${payment.orderId}`}>
                Inspect order
              </Link>
              <Link href={`/admin/events/${payment.order.eventId}`}>Event</Link>
              <Link href={`/admin/users/${payment.order.attendeeId}`}>
                Attendee
              </Link>
              {payment.replayOfAttemptId && (
                <Link href={`/admin/payments/${payment.replayOfAttemptId}`}>
                  Original capture
                </Link>
              )}
            </div>
            {payment.order.financialReviewRequired && (
              <p role="alert">
                Financial history requires investigation; no manual success
                override exists.
              </p>
            )}
            {["INITIATING", "PENDING", "UNKNOWN"].includes(payment.status) && (
              <RecoveryAction kind="payments" id={payment.id} />
            )}
            <section className={styles.panel}>
              <h2>Persisted callback / verification timeline</h2>
              <p>
                Shows up to 100 callback records. Raw provider payloads,
                validation credentials and checkout URLs are omitted.
              </p>
              <ol className={styles.timeline}>
                <li>
                  Attempt initiated: {formatEventDate(payment.initiatedAt)}
                </li>
                {payment.events.map((event) => (
                  <li key={event.id}>
                    {event.eventType} · received{" "}
                    {formatEventDate(event.receivedAt)} ·{" "}
                    {event.processedAt
                      ? `verification processed ${formatEventDate(event.processedAt)}`
                      : "awaiting verification"}
                    {event.processingError && (
                      <p role="status">{event.processingError}</p>
                    )}
                  </li>
                ))}
                {payment.completedAt && (
                  <li>
                    Persisted terminal timestamp:{" "}
                    {formatEventDate(payment.completedAt)} · {payment.status}
                  </li>
                )}
              </ol>
            </section>
            <section className={styles.panel}>
              <h2>Capture refunds</h2>
              {payment.refunds.length ? (
                payment.refunds.map((refund) => (
                  <p key={refund.id}>
                    <Link href={`/admin/refunds/${refund.id}`}>
                      {refund.reason} · {refund.status} ·{" "}
                      {formatMoney(refund.amountPaisa)}
                    </Link>
                    {refund.needsInvestigation
                      ? " · investigation required"
                      : ""}
                  </p>
                ))
              ) : (
                <p>No refund records for this attempt.</p>
              )}
            </section>
            <AuditLink type="PAYMENT_ATTEMPT" id={payment.id} />
          </>
        )}
      </DetailPanel>
    );
  if (kind === "refunds")
    return (
      <DetailPanel kind={kind} read={getAdminRefund}>
        {(refund) => (
          <>
            <h1>Refund investigation</h1>
            <StatusBadge status={refund.status} />
            <p>
              {refund.order.eventNameSnapshot} ·{" "}
              {formatMoney(refund.amountPaisa)} · {refund.reason}
            </p>
            <div className={styles.actions}>
              <Link href={`/admin/orders/${refund.orderId}`}>
                Inspect order
              </Link>
              {refund.paymentAttemptId && (
                <Link href={`/admin/payments/${refund.paymentAttemptId}`}>
                  Captured payment
                </Link>
              )}
              {refund.requestedById && (
                <Link href={`/admin/users/${refund.requestedById}`}>
                  Requester
                </Link>
              )}
              {refund.reviewedById && (
                <Link href={`/admin/users/${refund.reviewedById}`}>
                  Reviewer
                </Link>
              )}
            </div>
            <RefundOperations refund={refund} />
            <section className={styles.panel}>
              <h2>Persisted refund history</h2>
              <ol className={styles.timeline}>
                <li>Requested {formatEventDate(refund.requestedAt)}</li>
                {refund.activities.map((activity) => (
                  <li key={activity.id}>
                    {activity.action} · {formatEventDate(activity.createdAt)}
                    {activity.note ? ` — ${activity.note}` : ""}
                  </li>
                ))}
              </ol>
              <p>
                PROCESSING is not a successful refund. Only SUCCEEDED means
                provider-confirmed settlement.
              </p>
            </section>
            <AuditLink type="REFUND" id={refund.id} />
          </>
        )}
      </DetailPanel>
    );
  if (kind === "orders")
    return (
      <DetailPanel kind={kind} read={getAdminOrder}>
        {(order) => (
          <>
            <h1>Order investigation</h1>
            {order.financialReviewRequired && (
              <p role="alert">
                Financial identity requires investigation. Do not manually mark
                paid, refund again, or override admission.
              </p>
            )}
            <StatusBadge status={order.status} />
            <p>
              {order.eventNameSnapshot} · {order.ticketTierNameSnapshot} ·{" "}
              {order.quantity} passes ·{" "}
              {formatMoney(order.totalAmountPaisaSnapshot)}
            </p>
            <p>
              Reserved {formatEventDate(order.createdAt)} · paid{" "}
              {order.paidAt ? formatEventDate(order.paidAt) : "Not confirmed"} ·
              refunded{" "}
              {order.refundedAt
                ? formatEventDate(order.refundedAt)
                : "Not confirmed"}
            </p>
            <Link href={`/admin/events/${order.eventId}`}>Event overview</Link>
            <section className={styles.panel}>
              <h2>Payment attempts</h2>
              {order.paymentAttempts.map((attempt) => (
                <p key={attempt.id}>
                  <Link href={`/admin/payments/${attempt.id}`}>
                    {attempt.merchantTransactionId} · {attempt.status} ·{" "}
                    {formatMoney(attempt.amountPaisa)}
                  </Link>
                  {attempt.id === order.fulfilledPaymentAttemptId
                    ? " · canonical purchase"
                    : ""}
                </p>
              ))}
            </section>
            <section className={styles.panel}>
              <h2>Issued passes</h2>
              {order.tickets.map((ticket) => (
                <p key={ticket.id}>
                  {ticket.id} · {ticket.status}
                </p>
              ))}
              {!order.tickets.length && <p>No issued passes.</p>}
              <p>Private QR credentials are never exposed here.</p>
            </section>
            <section className={styles.panel}>
              <h2>Refunds</h2>
              {order.refunds.map((refund) => (
                <p key={refund.id}>
                  <Link href={`/admin/refunds/${refund.id}`}>
                    {refund.reason} · {refund.status}
                  </Link>
                </p>
              ))}
            </section>
            <AuditLink type="ORDER" id={order.id} />
          </>
        )}
      </DetailPanel>
    );
  return (
    <DetailPanel kind={kind} read={getAdminAudit}>
      {(log) => (
        <>
          <h1>{log.action.replaceAll("_", " ")}</h1>
          <p>{formatEventDate(log.createdAt)}</p>
          <p>
            Actor:{" "}
            {log.actor ? (
              <Link href={`/admin/users/${log.actor.id}`}>
                {log.actor.displayName}
              </Link>
            ) : (
              "System"
            )}
          </p>
          <p>
            Entity: {log.entityType} · {log.entityId}
          </p>
          {adminRecordLink(log.entityType, log.entityId) && (
            <Link href={adminRecordLink(log.entityType, log.entityId)!}>
              Inspect linked record
            </Link>
          )}
          <section className={styles.panel}>
            <h2>Safe change evidence</h2>
            <dl className={styles.facts}>
              {Object.entries(log.metadata).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
            {!Object.keys(log.metadata).length && (
              <p>
                No public diagnostic metadata was retained. Credentials and raw
                provider payloads are not shown.
              </p>
            )}
          </section>
        </>
      )}
    </DetailPanel>
  );
}
function AuditLink({ type, id }: { type: string; id: string }) {
  return (
    <p>
      <Link href={`/admin/audit-logs?entityType=${type}&entityId=${id}`}>
        Audit history for this record
      </Link>
    </p>
  );
}
function RecoveryAction({
  kind,
  id,
}: {
  kind: "payments" | "refunds";
  id: string;
}) {
  const { session } = useAuth();
  const client = useQueryClient();
  return (
    <AdminAction
      label="Schedule provider verification"
      description="This queues a deduplicated verification job; it cannot mark a payment paid, force a refund success, or issue another capture."
      onConfirm={async (reason) => {
        try {
          const result = await requestReconciliation(kind, id, reason);
          return result;
        } finally {
          if (session)
            await invalidateMutation(client, session.user.id, "admin");
        }
      }}
    />
  );
}
function EventDetail({ event }: { event: ManagedEventDetail }) {
  const { session } = useAuth();
  const client = useQueryClient();
  return (
    <>
      <h1>{event.title}</h1>
      <StatusBadge status={event.status} />
      <p>
        {formatEventRange(event.startAt, event.endAt)} · {event.venue},{" "}
        {event.city}
      </p>
      <p>{event.description}</p>
      <p>
        Orders: {event._count.orders} · active tiers: {event._count.ticketTiers}
      </p>
      <div className={styles.actions}>
        <Link href={`/organizer/events/${event.id}/orders`}>
          Event order ledger
        </Link>
        <Link href={`/organizer/events/${event.id}/reports`}>
          Financial / attendance reports
        </Link>
      </div>
      <section className={styles.panel}>
        <h2>Saved inventory</h2>
        <DataTable
          caption="Event ticket tiers"
          rows={event.publicationReadiness.tiers}
          rowKey={(tier) => tier.id}
          columns={[
            { key: "tier", label: "Tier", cell: (tier) => tier.name },
            {
              key: "price",
              label: "Price BDT",
              cell: (tier) => formatMoney(tier.pricePaisa),
            },
            {
              key: "capacity",
              label: "Capacity",
              cell: (tier) => tier.capacity,
            },
            {
              key: "sold",
              label: "Sold / reserved",
              cell: (tier) => `${tier.soldQuantity} / ${tier.reservedQuantity}`,
            },
            {
              key: "available",
              label: "Available",
              cell: (tier) => tier.availableQuantity,
            },
          ]}
        />
      </section>
      {event.capabilities.canCancel && (
        <AdminAction
          label="Cancel event"
          confirmation={event.title}
          description={`Cancellation is irreversible. ${event.cancellationImpact.paidOrders} paid orders require refund assessment; ${event.cancellationImpact.activeTickets} active/used passes will be voided. Queued dispatch is not completed refund settlement.`}
          onConfirm={async (reason) => {
            try {
              await apiClient(
                `/api/admin/events/${event.id}/cancel`,
                z.object({ id: z.uuid(), status: z.literal("CANCELLED") }),
                {
                  method: "POST",
                  ...jsonBody({ reason, confirmationTitle: event.title }),
                },
              );
            } finally {
              if (session)
                await Promise.all([
                  invalidateMutation(client, session.user.id, "admin"),
                  invalidateMutation(client, session.user.id, "event"),
                  invalidateMutation(client, session.user.id, "refund"),
                ]);
            }
          }}
        />
      )}
      {event.status === "CANCELLED" && (
        <section className={styles.panel}>
          <h2>Cancellation progress</h2>
          <p>
            Dispatch: {event.cancellationState.dispatchStatus ?? "Not started"}
          </p>
          {Object.entries(event.cancellationState.refundsByStatus).map(
            ([status, count]) => (
              <p key={status}>
                {status}: {count}
              </p>
            ),
          )}
          <p>
            Provider processing/investigation is distinct from dispatch
            completion.
          </p>
        </section>
      )}
      <AuditLink type="EVENT" id={event.id} />
    </>
  );
}
function UserDetailActions({
  user,
}: {
  user: z.infer<typeof adminUserSchema>;
}) {
  const { session } = useAuth();
  const client = useQueryClient();
  const [command, setCommand] = useState<UserCommand | null>(null);
  const disabled = user.status === "DELETED" || user.id === session?.user.id;
  const invalidate = () =>
    session
      ? invalidateMutation(client, session.user.id, "adminUser")
      : Promise.resolve();
  return (
    <>
      <p>
        Administrator roles are seed-only. The last active admin is protected.
        Self suspension/deletion is forbidden; organizers with draft/published
        events cannot be demoted/deleted.
      </p>
      <div className={styles.actions}>
        <Button
          disabled={disabled || user.role === "ADMIN"}
          onClick={() =>
            setCommand({
              id: user.id,
              path: "role",
              body: {
                role: user.role === "ORGANIZER" ? "ATTENDEE" : "ORGANIZER",
              },
            })
          }
        >
          Change role
        </Button>
        <Button
          disabled={disabled}
          onClick={() =>
            setCommand({
              id: user.id,
              path: "status",
              body: {
                status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
              },
            })
          }
        >
          {user.status === "ACTIVE" ? "Suspend" : "Activate"}
        </Button>
        <AdminAction
          label="Delete user"
          disabled={disabled}
          confirmation={user.email}
          description="Soft-delete this account and revoke its sessions. History remains intact, and server last-admin/organizer restrictions still apply."
          onConfirm={async (reason) => {
            try {
              await apiClient(`/api/admin/users/${user.id}`, z.null(), {
                method: "DELETE",
                ...jsonBody({ reason }),
              });
            } finally {
              await invalidate();
            }
          }}
        />
      </div>
      {command && (
        <UserChangeDialog
          key={command.path}
          command={command}
          onDismiss={() => setCommand(null)}
          onConfirm={async (value) => {
            try {
              return await apiClient(
                `/api/admin/users/${value.id}/${value.path}`,
                adminUserSchema,
                { method: "PATCH", ...jsonBody(value.body) },
              );
            } finally {
              await invalidate();
            }
          }}
        />
      )}
    </>
  );
}
