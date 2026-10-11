import { sessionFetch } from "./session-fetch";

export type AttendeeTicket = {
  id: string;
  orderId: string;
  eventId: string;
  ticketTierId: string;
  sequence: number;
  status: "ACTIVE" | "CHECKED_IN" | "VOID" | "REFUNDED";
  checkedInAt: string | null;
  createdAt: string;
  event: {
    title: string;
    slug: string;
    venue: string;
    city: string;
    startAt: string;
    endAt: string;
  };
  ticketTier: { name: string };
};

type ApiResponse<T> = { success: true; data: T };
type ApiError = { message?: string; errors?: Array<{ message?: string }> };
export class TicketApiError extends Error {}

async function ticketRequest<T>(path: string) {
  const response = await sessionFetch(
    path ? `/api/tickets/${path}` : "/api/tickets",
    { headers: {} },
  );
  const payload = (await response.json().catch(() => ({}))) as
    ApiResponse<T> | ApiError;
  if (
    !response.ok ||
    !("success" in payload) ||
    !payload.success ||
    !("data" in payload)
  ) {
    const error = payload as ApiError;
    throw new TicketApiError(
      error.errors?.[0]?.message ??
        error.message ??
        "Your tickets could not be loaded.",
    );
  }
  return payload.data;
}

export const getTickets = () => ticketRequest<AttendeeTicket[]>("");
export const getTicket = (ticketId: string) =>
  ticketRequest<AttendeeTicket>(ticketId);

export async function getTicketQr(ticketId: string) {
  const response = await sessionFetch(`/api/tickets/${ticketId}/qr`, {
    headers: {},
  });
  if (!response.ok) throw new TicketApiError("This QR pass is not available.");
  return response.text();
}
