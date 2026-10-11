import { sessionFetch } from "./session-fetch";

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

type ApiResponse<T> = { success: true; data: T };
type ApiError = { message?: string; errors?: Array<{ message?: string }> };
export class OrganizerApiError extends Error {}

export async function getManagedEvents() {
  const response = await sessionFetch("/api/organizer/events", { headers: {} });
  const payload = (await response.json().catch(() => ({}))) as
    ApiResponse<ManagedEvent[]> | ApiError;
  if (
    !response.ok ||
    !("success" in payload) ||
    !payload.success ||
    !("data" in payload)
  ) {
    const error = payload as ApiError;
    throw new OrganizerApiError(
      error.errors?.[0]?.message ??
        error.message ??
        "Your events could not be loaded.",
    );
  }
  return payload.data;
}

export type CreateEventInput = Omit<
  ManagedEvent,
  "id" | "status" | "createdAt" | "updatedAt"
>;

export async function createManagedEvent(input: CreateEventInput) {
  const response = await sessionFetch("/api/organizer/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => ({}))) as
    ApiResponse<ManagedEvent> | ApiError;
  if (
    !response.ok ||
    !("success" in payload) ||
    !payload.success ||
    !("data" in payload)
  ) {
    const error = payload as ApiError;
    throw new OrganizerApiError(
      error.errors?.[0]?.message ??
        error.message ??
        "Your event could not be created.",
    );
  }
  return payload.data;
}

export type TicketTier = {
  id: string;
  name: string;
  pricePaisa: number;
  capacity: number;
  availableQuantity?: number;
  salesStartAt: string;
  salesEndAt: string;
};

export type CreateTicketTierInput = Omit<
  TicketTier,
  "id" | "availableQuantity"
>;

export async function createTicketTier(
  eventId: string,
  input: CreateTicketTierInput,
) {
  const response = await sessionFetch(
    `/api/organizer/events/${eventId}/ticket-tiers`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const payload = (await response.json().catch(() => ({}))) as
    ApiResponse<TicketTier> | ApiError;
  if (
    !response.ok ||
    !("success" in payload) ||
    !payload.success ||
    !("data" in payload)
  ) {
    const error = payload as ApiError;
    throw new OrganizerApiError(
      error.errors?.[0]?.message ??
        error.message ??
        "Your ticket tier could not be created.",
    );
  }
  return payload.data;
}

export async function publishManagedEvent(eventId: string) {
  const response = await sessionFetch(
    `/api/organizer/events/${eventId}/publish`,
    {
      method: "POST",
      headers: {},
    },
  );
  const payload = (await response.json().catch(() => ({}))) as
    ApiResponse<ManagedEvent> | ApiError;
  if (
    !response.ok ||
    !("success" in payload) ||
    !payload.success ||
    !("data" in payload)
  ) {
    const error = payload as ApiError;
    throw new OrganizerApiError(
      error.errors?.[0]?.message ??
        error.message ??
        "This event could not be published.",
    );
  }
  return payload.data;
}

export type CheckInRecord = {
  id: string;
  sequence: number;
  checkedInAt: string;
  attendee: { displayName: string; email: string };
  ticketTier: { name: string };
  checkedInBy: { displayName: string } | null;
};

type CheckInConfirmation = {
  id: string;
  status: string;
  ticketTier: { name: string };
};

type CheckInHistory = { records: CheckInRecord[]; total: number };

export async function getCheckInHistory(eventId: string) {
  const response = await sessionFetch(
    `/api/organizer/events/${eventId}/check-ins`,
    { headers: {} },
  );
  const payload = (await response.json().catch(() => ({}))) as
    (ApiResponse<CheckInRecord[]> & { meta?: { total: number } }) | ApiError;
  if (
    !response.ok ||
    !("success" in payload) ||
    !payload.success ||
    !("data" in payload)
  ) {
    const error = payload as ApiError;
    throw new OrganizerApiError(
      error.errors?.[0]?.message ??
        error.message ??
        "Check-in history could not be loaded.",
    );
  }
  return {
    records: payload.data,
    total: payload.meta?.total ?? payload.data.length,
  } satisfies CheckInHistory;
}

export async function checkInTicket(eventId: string, qrToken: string) {
  const response = await sessionFetch(
    `/api/organizer/events/${eventId}/check-ins`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken }),
    },
  );
  const payload = (await response.json().catch(() => ({}))) as
    ApiResponse<CheckInConfirmation> | ApiError;
  if (
    !response.ok ||
    !("success" in payload) ||
    !payload.success ||
    !("data" in payload)
  ) {
    const error = payload as ApiError;
    throw new OrganizerApiError(
      error.errors?.[0]?.message ??
        error.message ??
        "Ticket could not be checked in.",
    );
  }
  return payload.data;
}

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

async function getReport<T>(path: string) {
  const response = await sessionFetch(`/api/organizer/${path}`, {
    headers: {},
  });
  const payload = (await response.json().catch(() => ({}))) as
    (ApiResponse<T> & { meta?: { total: number } }) | ApiError;
  if (
    !response.ok ||
    !("success" in payload) ||
    !payload.success ||
    !("data" in payload)
  ) {
    const error = payload as ApiError;
    throw new OrganizerApiError(
      error.errors?.[0]?.message ??
        error.message ??
        "Event reports could not be loaded.",
    );
  }
  return payload;
}

export const getEventReport = async (eventId: string) =>
  (await getReport<EventReport>(`events/${eventId}/reports/statistics`)).data;
export const getEventOrders = async (eventId: string) =>
  (await getReport<EventOrder[]>(`events/${eventId}/reports/orders`)).data;
