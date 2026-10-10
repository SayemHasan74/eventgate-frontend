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
