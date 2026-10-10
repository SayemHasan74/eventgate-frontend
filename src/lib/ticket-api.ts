export type AttendeeTicket = {
  id: string;
  orderId: string;
  eventId: string;
  ticketTierId: string;
  sequence: number;
  status: "ACTIVE" | "CHECKED_IN" | "VOID" | "REFUNDED";
  checkedInAt: string | null;
  createdAt: string;
  event: { title: string; slug: string; venue: string; city: string; startAt: string; endAt: string };
  ticketTier: { name: string };
};

type ApiResponse<T> = { success: true; data: T };
type ApiError = { message?: string; errors?: Array<{ message?: string }> };
export class TicketApiError extends Error {}

async function ticketRequest<T>(accessToken: string, path: string) {
  const response = await fetch(path ? `/api/tickets/${path}` : "/api/tickets", { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T> | ApiError;
  if (!response.ok || !("success" in payload) || !payload.success || !("data" in payload)) {
    const error = payload as ApiError;
    throw new TicketApiError(error.errors?.[0]?.message ?? error.message ?? "Your tickets could not be loaded.");
  }
  return payload.data;
}

export const getTickets = (accessToken: string) => ticketRequest<AttendeeTicket[]>(accessToken, "");
export const getTicket = (accessToken: string, ticketId: string) => ticketRequest<AttendeeTicket>(accessToken, ticketId);

export async function getTicketQr(accessToken: string, ticketId: string) {
  const response = await fetch(`/api/tickets/${ticketId}/qr`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new TicketApiError("This QR pass is not available.");
  return response.text();
}
