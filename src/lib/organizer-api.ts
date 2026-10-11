import { z } from "zod";
import { apiClient, apiList, jsonBody } from "./api-client";
import {
  moneySchema,
  orderStatusSchema,
  ticketStatusSchema,
} from "./api-schemas";
export { ApiError as OrganizerApiError } from "./api-error";
export type ManagedEvent = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  venue: string;
  city: string;
  address: string;
  startAt: string;
  endAt: string;
  imageUrl: string | null;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  createdAt: string;
  updatedAt: string;
};
export type TicketTier = {
  id: string;
  name: string;
  pricePaisa: number;
  capacity: number;
  availableQuantity?: number;
  salesStartAt: string;
  salesEndAt: string;
};
export type CheckInRecord = {
  id: string;
  sequence: number;
  checkedInAt: string;
  attendee: { displayName: string; email: string };
  ticketTier: { name: string };
  checkedInBy: { displayName: string } | null;
};
export type EventReport = {
  orders: Array<{
    status: string;
    _count: { _all: number };
    _sum: { totalAmountPaisaSnapshot: number | null };
  }>;
  tiers: Array<{
    id: string;
    name: string;
    capacity: number;
    soldQuantity: number;
    reservedQuantity: number;
  }>;
  paidRevenuePaisa: number;
  paidOrderCount: number;
  checkedIn: number;
};
export type EventOrder = {
  id: string;
  quantity: number;
  totalAmountPaisaSnapshot: number;
  currency: string;
  status: string;
  createdAt: string;
  attendee: { displayName: string; email: string };
  ticketTier: { name: string };
};
export type CreateEventInput = Omit<
  ManagedEvent,
  "id" | "status" | "createdAt" | "updatedAt"
>;
export type CreateTicketTierInput = Omit<
  TicketTier,
  "id" | "availableQuantity"
>;
const timestamp = z.iso.datetime({ offset: true });
const eventSchema: z.ZodType<ManagedEvent> = z.object({
  id: z.uuid(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  category: z.string(),
  venue: z.string(),
  city: z.string(),
  address: z.string(),
  startAt: timestamp,
  endAt: timestamp,
  imageUrl: z.string().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]),
  createdAt: timestamp,
  updatedAt: timestamp,
});
const tierSchema: z.ZodType<TicketTier> = z.object({
  id: z.uuid(),
  name: z.string(),
  pricePaisa: moneySchema,
  capacity: z.number().int().nonnegative(),
  availableQuantity: z.number().int().nonnegative().optional(),
  salesStartAt: timestamp,
  salesEndAt: timestamp,
});
const historySchema: z.ZodType<CheckInRecord> = z.object({
  id: z.uuid(),
  sequence: z.number().int().positive(),
  checkedInAt: timestamp,
  attendee: z.object({ displayName: z.string(), email: z.email() }),
  ticketTier: z.object({ name: z.string() }),
  checkedInBy: z.object({ displayName: z.string() }).nullable(),
});
const reportSchema: z.ZodType<EventReport> = z.object({
  orders: z.array(
    z.object({
      status: orderStatusSchema,
      _count: z.object({ _all: z.number().int().nonnegative() }),
      _sum: z.object({ totalAmountPaisaSnapshot: moneySchema.nullable() }),
    }),
  ),
  tiers: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      capacity: z.number().int().nonnegative(),
      soldQuantity: z.number().int().nonnegative(),
      reservedQuantity: z.number().int().nonnegative(),
    }),
  ),
  paidRevenuePaisa: moneySchema,
  paidOrderCount: z.number().int().nonnegative(),
  checkedIn: z.number().int().nonnegative(),
});
const eventOrderSchema: z.ZodType<EventOrder> = z.object({
  id: z.uuid(),
  quantity: z.number().int().positive(),
  totalAmountPaisaSnapshot: moneySchema,
  currency: z.literal("BDT"),
  status: orderStatusSchema,
  createdAt: timestamp,
  attendee: z.object({ displayName: z.string(), email: z.email() }),
  ticketTier: z.object({ name: z.string() }),
});
const eventPath = (id: string) =>
  "/api/organizer/events/" + encodeURIComponent(id);
export const getManagedEvents = async (filters = new URLSearchParams()) =>
  (await apiList("/api/organizer/events?" + filters, eventSchema)).data;
export const createManagedEvent = (input: CreateEventInput) =>
  apiClient("/api/organizer/events", eventSchema, {
    method: "POST",
    ...jsonBody(input),
  });
export const updateManagedEvent = (
  id: string,
  input: Partial<CreateEventInput>,
) =>
  apiClient(eventPath(id), eventSchema, {
    method: "PATCH",
    ...jsonBody(input),
  });
export const deleteManagedEvent = (id: string) =>
  apiClient(eventPath(id), z.null(), { method: "DELETE" });
export const createTicketTier = (id: string, input: CreateTicketTierInput) =>
  apiClient(eventPath(id) + "/ticket-tiers", tierSchema, {
    method: "POST",
    ...jsonBody(input),
  });
export const updateTicketTier = (
  id: string,
  tierId: string,
  input: Partial<CreateTicketTierInput>,
) =>
  apiClient(
    eventPath(id) + "/ticket-tiers/" + encodeURIComponent(tierId),
    tierSchema,
    { method: "PATCH", ...jsonBody(input) },
  );
export const deleteTicketTier = (id: string, tierId: string) =>
  apiClient(
    eventPath(id) + "/ticket-tiers/" + encodeURIComponent(tierId),
    z.null(),
    { method: "DELETE" },
  );
export const publishManagedEvent = (id: string) =>
  apiClient(eventPath(id) + "/publish", eventSchema, { method: "POST" });
export async function getCheckInHistory(
  id: string,
  filters = new URLSearchParams(),
) {
  const result = await apiList(
    eventPath(id) + "/check-ins?" + filters,
    historySchema,
  );
  return { records: result.data, total: result.meta.total, meta: result.meta };
}
export const checkInTicket = (id: string, qrToken: string) =>
  apiClient(
    eventPath(id) + "/check-ins",
    z.object({
      id: z.uuid(),
      status: ticketStatusSchema,
      ticketTier: z.object({ name: z.string() }),
    }),
    { method: "POST", ...jsonBody({ qrToken }) },
  );
export const getEventReport = (id: string) =>
  apiClient(eventPath(id) + "/reports/statistics", reportSchema);
export const getEventOrders = async (
  id: string,
  filters = new URLSearchParams(),
) =>
  (
    await apiList(
      eventPath(id) + "/reports/orders?" + filters,
      eventOrderSchema,
    )
  ).data;
