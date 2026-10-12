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
  salesPaused: boolean;
  reservedQuantity: number;
  soldQuantity: number;
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
export type CreateTicketTierInput = Pick<
  TicketTier,
  "name" | "pricePaisa" | "capacity" | "salesStartAt" | "salesEndAt"
> & { salesPaused?: boolean };
export type UpdateTicketTierInput = Partial<CreateTicketTierInput> & {
  closeSales?: true;
};
const timestamp = z.iso.datetime({ offset: true });
const eventCapabilitiesSchema = z.object({
  editable: z.boolean(),
  editableFields: z.array(z.string()),
  canPublish: z.boolean(),
  canCancel: z.boolean(),
  canDelete: z.boolean(),
  canManageTiers: z.boolean(),
});
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
export const getManagedEvent = (id: string) =>
  apiClient(
    "/api/organizer/events/" + encodeURIComponent(id),
    z.intersection(
      eventSchema,
      z.object({
        capabilities: eventCapabilitiesSchema,
        publicationReadiness: z.object({
          ready: z.boolean(),
          blockers: z.array(
            z.object({
              code: z.string(),
              message: z.string(),
              field: z.string().optional(),
              tierId: z.string().optional(),
            }),
          ),
          tiers: z.array(
            z.object({
              id: z.uuid(),
              name: z.string(),
              pricePaisa: moneySchema,
              capacity: z.number().int().positive(),
              reservedQuantity: z.number().int().nonnegative(),
              soldQuantity: z.number().int().nonnegative(),
              availableQuantity: z.number().int().nonnegative(),
              salesStartAt: timestamp,
              salesEndAt: timestamp,
              salesPaused: z.boolean(),
              eligible: z.boolean(),
              reasons: z.array(z.string()),
            }),
          ),
          checkedAt: timestamp,
        }),
        setupChecks: z.object({
          futureStart: z.boolean(),
          validDates: z.boolean(),
          hasActiveTier: z.boolean(),
        }),
        checkInWindow: z.object({
          opensAt: timestamp,
          closesAt: timestamp,
          isOpen: z.boolean(),
        }),
        cancellationImpact: z.object({
          paidOrders: z.number().int().nonnegative(),
          activeTickets: z.number().int().nonnegative(),
          pendingOrders: z.number().int().nonnegative(),
        }),
        cancellationState: z.object({
          cancelledAt: timestamp.nullable(),
          dispatchStatus: z
            .enum(["PENDING", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"])
            .nullable(),
          dispatchCompletedAt: timestamp.nullable(),
          refundsByStatus: z.record(z.string(), z.number().int().nonnegative()),
        }),
        serverTime: timestamp,
        _count: z.object({
          orders: z.number().int().nonnegative(),
          ticketTiers: z.number().int().nonnegative(),
        }),
      }),
    ),
  );
export type ManagedEventDetail = Awaited<ReturnType<typeof getManagedEvent>>;
const eventSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  slug: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]),
  venue: z.string(),
  city: z.string(),
  startAt: timestamp,
  endAt: timestamp,
  deletedAt: timestamp.nullable(),
});
export const getOrganizerOverview = () =>
  apiClient(
    "/api/organizer/overview",
    z.object({
      eventsByStatus: z.record(z.string(), z.number().int().nonnegative()),
      paidOrders: z.number().int().nonnegative(),
      activeTickets: z.number().int().nonnegative(),
      recentEvents: z.array(eventSummarySchema),
      upcomingEvents: z.array(eventSummarySchema),
      draftEvents: z.array(eventSummarySchema),
      serverTime: timestamp,
    }),
  );
const tierSchema: z.ZodType<TicketTier> = z.object({
  salesPaused: z.boolean(),
  reservedQuantity: z.number().int().nonnegative(),
  soldQuantity: z.number().int().nonnegative(),
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
  apiList("/api/organizer/events?" + filters, eventSchema);
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
  input: UpdateTicketTierInput,
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
export const cancelManagedEvent = (id: string) =>
  apiClient(eventPath(id) + "/cancel", eventSchema, { method: "POST" });
const managedTierSchema = z.intersection(
  tierSchema,
  z.object({
    availableQuantity: z.number().int().nonnegative(),
    saleState: z.enum([
      "UNAVAILABLE",
      "PAUSED",
      "CLOSED",
      "UPCOMING",
      "SOLD_OUT",
      "OPEN",
    ]),
    canEdit: z.boolean(),
    canDelete: z.boolean(),
    editableFields: z.array(z.string()),
    minimumCapacity: z.number().int().nonnegative(),
    restrictionCodes: z.array(z.string()),
    canCloseSales: z.boolean(),
    canPauseSales: z.boolean(),
    canResumeSales: z.boolean(),
    serverTime: timestamp,
  }),
);
export type ManagedTier = z.infer<typeof managedTierSchema>;
export const getManagedTiers = (id: string, filters = new URLSearchParams()) =>
  apiList(eventPath(id) + "/ticket-tiers?" + filters, managedTierSchema);
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
) => apiList(eventPath(id) + "/reports/orders?" + filters, eventOrderSchema);
