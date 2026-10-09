import { appConfig } from "@/lib/env";

type ApiListResponse<T> = {
  success: true;
  message: string;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ApiResponse<T> = {
  success: true;
  message: string;
  data: T;
};

export type PublicTicketTier = {
  id: string;
  name: string;
  pricePaisa: number;
  capacity: number;
  availableQuantity: number;
  salesStartAt: string;
  salesEndAt: string;
};

export type PublicEvent = {
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
  ticketTiers: PublicTicketTier[];
};

export type EventDiscoveryQuery = {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  city?: string;
  sort: "soonest" | "latest" | "newest" | "title";
};

export type EventDiscoveryResult =
  | { status: "ready"; events: PublicEvent[]; meta: ApiListResponse<PublicEvent>["meta"] }
  | { status: "unavailable" };

export type PublicEventResult =
  | { status: "ready"; event: PublicEvent; retrievedAt: number }
  | { status: "not-found" }
  | { status: "unavailable" };

export async function getPublicEvents(query: EventDiscoveryQuery): Promise<EventDiscoveryResult> {
  const parameters = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    sort: query.sort,
  });

  if (query.search) parameters.set("search", query.search);
  if (query.category) parameters.set("category", query.category);
  if (query.city) parameters.set("city", query.city);

  try {
    const response = await fetch(`${appConfig.apiBaseUrl}/events?${parameters.toString()}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return { status: "unavailable" };

    const payload = (await response.json()) as ApiListResponse<PublicEvent>;
    if (!payload.success || !Array.isArray(payload.data)) return { status: "unavailable" };

    return { status: "ready", events: payload.data, meta: payload.meta };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getPublicEvent(slug: string): Promise<PublicEventResult> {
  try {
    const response = await fetch(`${appConfig.apiBaseUrl}/events/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "unavailable" };

    const payload = (await response.json()) as ApiResponse<PublicEvent>;
    if (!payload.success || !payload.data) return { status: "unavailable" };

    return { status: "ready", event: payload.data, retrievedAt: Date.now() };
  } catch {
    return { status: "unavailable" };
  }
}
