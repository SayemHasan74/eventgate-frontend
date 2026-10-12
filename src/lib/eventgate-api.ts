import "server-only";
import { upstream } from "./server/upstream";
import { z } from "zod";
import { parseEnvelope, paginationSchema } from "./api-error";
import { moneySchema } from "./api-schemas";

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

export type PublicTicketTier = {
  salesPaused: boolean;
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
  startAfter?: string;
  startBefore?: string;
  sort: "soonest" | "latest" | "newest" | "title";
};

export type EventDiscoveryResult =
  | {
      status: "ready";
      events: PublicEvent[];
      meta: ApiListResponse<PublicEvent>["meta"];
    }
  | { status: "unavailable" };

export type PublicEventResult =
  | { status: "ready"; event: PublicEvent; retrievedAt: number }
  | { status: "not-found" }
  | { status: "unavailable" };

export async function getPublicEvents(
  query: EventDiscoveryQuery,
): Promise<EventDiscoveryResult> {
  const parameters = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    sort: query.sort,
  });

  if (query.search) parameters.set("search", query.search);
  if (query.category) parameters.set("category", query.category);
  if (query.city) parameters.set("city", query.city);
  if (query.startAfter) parameters.set("startAfter", query.startAfter);
  if (query.startBefore) parameters.set("startBefore", query.startBefore);

  try {
    const response = await upstream(
      `events?${parameters.toString()}`,
      {
        cache: "no-store",
      },
      true,
    );

    if (!response.ok) return { status: "unavailable" };

    const raw = await response.json();
    const payload = parseEnvelope(response, raw, z.array(publicEventSchema));
    const meta = paginationSchema.parse(raw.meta);

    return { status: "ready", events: payload.data, meta };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getPublicEvent(slug: string): Promise<PublicEventResult> {
  try {
    const response = await upstream(
      `events/${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
      },
      true,
    );

    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "unavailable" };

    const payload = parseEnvelope(
      response,
      await response.json(),
      publicEventSchema,
    );

    return { status: "ready", event: payload.data, retrievedAt: Date.now() };
  } catch {
    return { status: "unavailable" };
  }
}
export async function getPublicFacets(): Promise<
  | { status: "ready"; categories: string[]; cities: string[] }
  | { status: "unavailable" }
> {
  try {
    const response = await upstream(
      "events/facets",
      { cache: "no-store" },
      true,
    );
    const data = parseEnvelope(
      response,
      await response.json(),
      z.object({
        categories: z.array(z.string()),
        cities: z.array(z.string()),
      }),
    ).data;
    return { status: "ready", ...data };
  } catch {
    return { status: "unavailable" };
  }
}
export async function getUpcomingPublicEvents(): Promise<EventDiscoveryResult> {
  const minute = Math.floor(Date.now() / 60000) * 60000;
  const result = await getPublicEvents({
    page: 1,
    limit: 6,
    sort: "soonest",
    startAfter: new Date(minute).toISOString(),
  });
  if (result.status !== "ready") return result;
  const now = Date.now();
  return {
    ...result,
    events: result.events
      .filter((event) => Date.parse(event.startAt) > now)
      .slice(0, 6),
  };
}

const publicEventSchema: z.ZodType<PublicEvent> = z.object({
  id: z.uuid(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  category: z.string(),
  venue: z.string(),
  city: z.string(),
  address: z.string(),
  startAt: z.iso.datetime({ offset: true }),
  endAt: z.iso.datetime({ offset: true }),
  imageUrl: z.string().nullable(),
  ticketTiers: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      pricePaisa: moneySchema,
      capacity: z.number().int().nonnegative(),
      availableQuantity: z.number().int().nonnegative(),
      salesPaused: z.boolean().default(false),
      salesStartAt: z.iso.datetime({ offset: true }),
      salesEndAt: z.iso.datetime({ offset: true }),
    }),
  ),
});
