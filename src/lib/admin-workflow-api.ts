import { z } from "zod";
import { apiClient, apiList, jsonBody } from "./api-client";
import {
  paymentAttemptSchema,
  refundSchema,
  orderDetailSchema,
} from "./api-schemas";
import { dhakaDayBounds } from "./format";
const timestamp = z.iso.datetime({ offset: true });
const count = z.number().int().nonnegative();
export const adminUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string(),
  role: z.enum(["ATTENDEE", "ORGANIZER", "ADMIN"]),
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]),
  createdAt: timestamp,
});
export const adminUserDetailSchema = adminUserSchema.extend({
  deletedAt: timestamp.nullable(),
  _count: z.object({ organizedEvents: count, orders: count, tickets: count }),
});
export const adminPaymentSchema = paymentAttemptSchema.extend({
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
  providerTransactionId: z.string().nullable(),
  replayOfAttemptId: z.uuid().nullable(),
  checkoutExpiresAt: timestamp.nullable(),
  events: z.array(
    z.object({
      id: z.uuid(),
      eventType: z.string(),
      receivedAt: timestamp,
      processedAt: timestamp.nullable(),
      processingError: z.string().nullable().default(null),
    }),
  ),
  order: z.object({
    id: z.uuid(),
    eventId: z.uuid(),
    attendeeId: z.uuid(),
    status: z.string(),
    eventNameSnapshot: z.string(),
    ticketTierNameSnapshot: z.string(),
    fulfilledPaymentAttemptId: z.uuid().nullable(),
    financialReviewRequired: z.boolean(),
  }),
  refunds: z.array(
    z.object({
      id: z.uuid(),
      reason: z.string(),
      status: z.string(),
      amountPaisa: z.number().int().nonnegative(),
      needsInvestigation: z.boolean(),
    }),
  ),
});
export const adminAuditSchema = z.object({
  id: z.uuid(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.uuid(),
  createdAt: timestamp,
  actor: z.object({ id: z.uuid(), displayName: z.string() }).nullable(),
});
export const adminAuditDetailSchema = adminAuditSchema.extend({
  metadata: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
  ),
});
export const jobSchema = z.object({
  id: z.uuid(),
  type: z.string(),
  status: z.enum(["PENDING", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]),
  runAt: timestamp,
  attempts: count,
  failureAttempts: count,
  maxAttempts: count,
  leaseExpiresAt: timestamp.nullable(),
  completedAt: timestamp.nullable(),
  createdAt: timestamp,
  reference: z
    .object({ entityId: z.uuid(), entityType: z.string() })
    .nullable(),
});
const recovery = z.object({ jobId: z.uuid(), status: z.string() });
export const getAdminUser = (id: string) =>
  apiClient(
    `/api/admin/users/${encodeURIComponent(id)}`,
    adminUserDetailSchema,
  );
export const getAdminPayment = (id: string) =>
  apiClient(
    `/api/admin/payments/${encodeURIComponent(id)}`,
    adminPaymentSchema,
  );
export const getAdminRefund = (id: string) =>
  apiClient(
    `/api/admin/refunds/${encodeURIComponent(id)}`,
    refundSchema.extend({
      order: z.object({
        id: z.uuid(),
        eventNameSnapshot: z.string(),
        status: z.string(),
      }),
    }),
  );
export const getAdminOrder = (id: string) =>
  apiClient(
    `/api/admin/orders/${encodeURIComponent(id)}`,
    orderDetailSchema.and(
      z.object({
        tickets: z.array(z.object({ id: z.uuid(), status: z.string() })),
      }),
    ),
  );
export const getAdminAudit = (id: string) =>
  apiClient(
    `/api/admin/reports/audit-logs/${encodeURIComponent(id)}`,
    adminAuditDetailSchema,
  );
export const getRecoveryJobs = (params: URLSearchParams) =>
  apiList(`/api/admin/reports/jobs?${params}`, jobSchema);
export const requestReconciliation = (
  kind: "payments" | "refunds",
  id: string,
  reason: string,
) =>
  apiClient(
    `/api/admin/${kind}/${encodeURIComponent(id)}/reconcile`,
    recovery,
    { method: "POST", ...jsonBody({ reason }) },
  );
export const retryRecoveryJob = (id: string, reason: string) =>
  apiClient(
    `/api/admin/reports/jobs/${encodeURIComponent(id)}/retry`,
    recovery,
    { method: "POST", ...jsonBody({ reason }) },
  );
export function adminRecordLink(type: string, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const routes: Record<string, string> = {
    USER: "users",
    EVENT: "events",
    ORDER: "orders",
    REFUND: "refunds",
    PAYMENT_ATTEMPT: "payments",
    JOB: "operations",
  };
  const route = routes[type];
  return route
    ? route === "operations"
      ? `/admin/operations?jobId=${encodeURIComponent(id)}`
      : `/admin/${route}/${encodeURIComponent(id)}`
    : null;
}
export function adminDateParams(values: {
  startDate?: string;
  endDate?: string;
}) {
  const params = new URLSearchParams();
  if (values.startDate)
    params.set("startAfter", dhakaDayBounds(values.startDate).start);
  if (values.endDate)
    params.set("startBefore", dhakaDayBounds(values.endDate).end);
  return params;
}
