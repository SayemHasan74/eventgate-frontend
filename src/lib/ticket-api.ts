import { z } from "zod";
import { apiClient, apiList } from "./api-client";
import { ticketSchema, qrSchema } from "./api-schemas";
import { ApiError } from "./api-error";
export { ApiError as TicketApiError } from "./api-error";
export type AttendeeTicket = z.infer<typeof ticketSchema>;
export const getTickets = async (filters = new URLSearchParams()) =>
  apiList("/api/tickets?" + filters, ticketSchema);
export const getTicket = (id: string) =>
  apiClient("/api/tickets/" + encodeURIComponent(id), ticketSchema);
export async function getTicketQr(id: string) {
  const qr = await apiClient(
    "/api/tickets/" + encodeURIComponent(id) + "/qr",
    qrSchema,
  );
  if (qr.ticketId.toLowerCase() !== id.toLowerCase())
    throw new ApiError(
      "The pass did not match this ticket.",
      502,
      "INVALID_API_RESPONSE",
    );
  return qr;
}
