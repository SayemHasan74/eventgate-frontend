import { z } from "zod";
import { apiClient, apiList } from "./api-client";
import { ticketSchema, qrSchema } from "./api-schemas";
import { ApiError } from "./api-error";
export { ApiError as TicketApiError } from "./api-error";
export type AttendeeTicket = z.infer<typeof ticketSchema>;
export const getTickets = async (filters = new URLSearchParams()) =>
  apiList("/api/tickets?" + filters, ticketSchema);
export const getTicket = (id: string, signal?: AbortSignal) =>
  apiClient("/api/tickets/" + encodeURIComponent(id), ticketSchema, { signal });
export async function getTicketQr(id: string, signal?: AbortSignal) {
  const qr = await apiClient(
    "/api/tickets/" + encodeURIComponent(id) + "/qr",
    qrSchema,
    { signal },
  );
  if (qr.ticketId.toLowerCase() !== id.toLowerCase())
    throw new ApiError(
      "The pass did not match this ticket.",
      502,
      "INVALID_API_RESPONSE",
    );
  return qr;
}
export const ticketBookingSchema = z
  .object({
    orderId: z.uuid(),
    eventId: z.uuid(),
    ticketTierId: z.uuid().optional(),
    canBuyMore: z.boolean().optional(),
    eventNameSnapshot: z.string(),
    tierName: z.string(),
    quantity: z.number().int().positive().max(10),
    passCount: z.number().int().positive().max(10),
    event: z.object({
      title: z.string(),
      slug: z.string(),
      venue: z.string(),
      city: z.string(),
      startAt: z.iso.datetime({ offset: true }),
      endAt: z.iso.datetime({ offset: true }),
      imageUrl: z.string().nullable(),
    }),
    statusCounts: z.record(z.string(), z.number().int().positive()),
    tickets: z
      .array(
        z.object({
          id: z.uuid(),
          sequence: z.number().int().positive(),
          status: z.enum(["ACTIVE", "CHECKED_IN", "VOIDED", "REFUNDED"]),
          effectiveAdmissionState: ticketSchema.shape.effectiveAdmissionState,
        }),
      )
      .max(10),
  })
  .refine(
    (group) =>
      group.tickets.length === group.passCount &&
      group.passCount === group.quantity &&
      new Set(group.tickets.map((ticket) => ticket.id)).size ===
        group.passCount &&
      new Set(group.tickets.map((ticket) => ticket.sequence)).size ===
        group.passCount &&
      Object.entries(group.statusCounts).every(
        ([state, count]) =>
          group.tickets.filter(
            (ticket) => ticket.effectiveAdmissionState === state,
          ).length === count,
      ) &&
      Object.values(group.statusCounts).reduce(
        (sum, count) => sum + count,
        0,
      ) === group.passCount,
    "Incomplete booking group.",
  );
export const getTicketBookings = (filters = new URLSearchParams()) =>
  apiList("/api/tickets/bookings?" + filters, ticketBookingSchema);
