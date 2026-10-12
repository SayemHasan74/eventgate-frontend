import { z } from "zod";
import { apiClient } from "./api-client";
import { moneySchema } from "./api-schemas";
import { dhakaDayBounds } from "./format";
const count = z.number().int().nonnegative();
const signedMoney = z.number().int().safe();
const timestamp = z.iso.datetime({ offset: true });
export const salesReportSchema = z.object({
  grossTicketSalesPaisa: moneySchema,
  bookingRefundsPaisa: moneySchema,
  netTicketSalesPaisa: signedMoney,
  pendingBookingRefundsPaisa: moneySchema,
  fulfilledPurchaseCount: count,
  excessCapturesPaisa: moneySchema,
  excessCaptureRefundsPaisa: moneySchema,
  ambiguousPurchaseCount: count,
  salesByDay: z.array(
    z.object({
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      grossPaisa: moneySchema,
      bookingRefundsPaisa: moneySchema,
      netPaisa: signedMoney,
      purchases: count,
    }),
  ),
  serverTime: timestamp,
});
export const inventoryReportSchema = z.object({
  summary: z.object({
    currentCapacity: count,
    currentSold: count,
    currentReserved: count,
    currentAvailable: count,
  }),
  tiers: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      deletedAt: timestamp.nullable(),
      capacity: count,
      soldQuantity: count,
      reservedQuantity: count,
      currentCapacity: count,
      currentSold: count,
      currentReserved: count,
      currentAvailable: count,
      historicalIssuedPasses: count,
      historicalOrderCount: count,
    }),
  ),
  serverTime: timestamp,
});
export const attendanceReportSchema = z.object({
  historicalIssuedPasses: count,
  checkedInPasses: count,
  validUnusedPasses: count,
  serverTime: timestamp,
});
export const eventStatisticsSchema = salesReportSchema
  .merge(attendanceReportSchema)
  .extend({ tiers: inventoryReportSchema.shape.tiers });
export type EventReport = z.infer<typeof eventStatisticsSchema>;
export type SalesReport = z.infer<typeof salesReportSchema>;
export type InventoryReport = z.infer<typeof inventoryReportSchema>;
const path = (id: string, panel: string, filters: URLSearchParams) =>
  `/api/organizer/events/${encodeURIComponent(id)}/reports/${panel}?${filters}`;
export const getEventSales = (id: string, filters: URLSearchParams) =>
  apiClient(path(id, "sales", filters), salesReportSchema);
export const getEventInventory = (
  id: string,
  filters = new URLSearchParams(),
) => apiClient(path(id, "inventory", filters), inventoryReportSchema);
export const getEventAttendance = (id: string, filters: URLSearchParams) =>
  apiClient(path(id, "attendance", filters), attendanceReportSchema);
export const eventOrdersExportUrl = (id: string, filters: URLSearchParams) =>
  path(id, "orders/export", filters);
export function reportParams(values: {
  status?: string;
  tierId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const params = new URLSearchParams();
  if (values.status) params.set("status", values.status);
  if (values.tierId) params.set("tierId", values.tierId);
  if (values.startDate)
    params.set("startAfter", dhakaDayBounds(values.startDate).start);
  if (values.endDate)
    params.set("startBefore", dhakaDayBounds(values.endDate).end);
  return params;
}
