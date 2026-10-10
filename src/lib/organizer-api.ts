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

export async function getManagedEvents(accessToken: string) {
  const response = await fetch("/api/organizer/events", { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<ManagedEvent[]> | ApiError;
  if (!response.ok || !("success" in payload) || !payload.success || !("data" in payload)) {
    const error = payload as ApiError;
    throw new OrganizerApiError(error.errors?.[0]?.message ?? error.message ?? "Your events could not be loaded.");
  }
  return payload.data;
}

export type CreateEventInput = Omit<ManagedEvent, "id" | "status" | "createdAt" | "updatedAt">;

export async function createManagedEvent(accessToken: string, input: CreateEventInput) {
  const response = await fetch("/api/organizer/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<ManagedEvent> | ApiError;
  if (!response.ok || !("success" in payload) || !payload.success || !("data" in payload)) {
    const error = payload as ApiError;
    throw new OrganizerApiError(error.errors?.[0]?.message ?? error.message ?? "Your event could not be created.");
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

export type CreateTicketTierInput = Omit<TicketTier, "id" | "availableQuantity">;

export async function createTicketTier(accessToken: string, eventId: string, input: CreateTicketTierInput) {
  const response = await fetch(`/api/organizer/events/${eventId}/ticket-tiers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<TicketTier> | ApiError;
  if (!response.ok || !("success" in payload) || !payload.success || !("data" in payload)) {
    const error = payload as ApiError;
    throw new OrganizerApiError(error.errors?.[0]?.message ?? error.message ?? "Your ticket tier could not be created.");
  }
  return payload.data;
}
