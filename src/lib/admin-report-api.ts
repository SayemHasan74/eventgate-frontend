import { z } from "zod";
import { apiClient, apiList } from "./api-client";
import {
  moneySchema,
  orderStatusSchema,
  paymentStatusSchema,
  refundStatusSchema,
} from "./api-schemas";

export type GroupStat = {
  status?: string;
  role?: string;
  _count: { _all: number };
  _sum?: {
    totalAmountPaisaSnapshot?: number | null;
    amountPaisa?: number | null;
  };
};
export type PlatformStats = {
  users: GroupStat[];
  events: GroupStat[];
  orders: GroupStat[];
  payments: GroupStat[];
  refunds: GroupStat[];
};
export type Operations = {
  events: Array<{
    id: string;
    title: string;
    status: string;
    startAt: string;
    organizer: { displayName: string; email: string };
  }>;
  payments: Array<{
    id: string;
    orderId: string;
    amountPaisa: number;
    currency: string;
    status: string;
    initiatedAt: string;
    completedAt: string | null;
  }>;
  refunds: Array<{
    id: string;
    orderId: string;
    amountPaisa: number;
    currency: string;
    reason: string;
    status: string;
    requestedAt: string;
    completedAt: string | null;
  }>;
};
export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor: { id: string; displayName: string; email: string } | null;
};

export { ApiError as AdminReportApiError } from "./api-error";
const timestamp = z.iso.datetime({ offset: true });
const person = z.object({ displayName: z.string(), email: z.email() });
const group = z.object({
  status: z.string().optional(),
  role: z.string().optional(),
  _count: z.object({ _all: z.number().int().nonnegative() }),
  _sum: z
    .object({
      totalAmountPaisaSnapshot: moneySchema.nullable().optional(),
      amountPaisa: moneySchema.nullable().optional(),
    })
    .optional(),
});
const stats: z.ZodType<PlatformStats> = z.object({
  users: z.array(group),
  events: z.array(group),
  orders: z.array(group.extend({ status: orderStatusSchema })),
  payments: z.array(group.extend({ status: paymentStatusSchema })),
  refunds: z.array(group.extend({ status: refundStatusSchema })),
});
const operations: z.ZodType<Operations> = z.object({
  events: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      status: z.string(),
      startAt: timestamp,
      organizer: person,
    }),
  ),
  payments: z.array(
    z.object({
      id: z.uuid(),
      orderId: z.uuid(),
      amountPaisa: moneySchema,
      currency: z.literal("BDT"),
      status: paymentStatusSchema,
      initiatedAt: timestamp,
      completedAt: timestamp.nullable(),
    }),
  ),
  refunds: z.array(
    z.object({
      id: z.uuid(),
      orderId: z.uuid(),
      amountPaisa: moneySchema,
      currency: z.literal("BDT"),
      reason: z.string(),
      status: refundStatusSchema,
      requestedAt: timestamp,
      completedAt: timestamp.nullable(),
    }),
  ),
});
const audit: z.ZodType<AuditLog> = z.object({
  id: z.uuid(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  createdAt: timestamp,
  actor: person.extend({ id: z.uuid() }).nullable(),
});
export const getPlatformStats = () =>
  apiClient("/api/admin/reports/statistics", stats);
export const getOperations = () =>
  apiClient("/api/admin/reports/operations", operations);
export async function getAuditLogs() {
  const result = await apiList("/api/admin/reports/audit-logs?limit=12", audit);
  return { logs: result.data, total: result.meta.total, meta: result.meta };
}
