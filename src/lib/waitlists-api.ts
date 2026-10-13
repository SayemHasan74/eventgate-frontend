import { z } from "zod";
import { apiClient, apiList, jsonBody } from "./api-client";
export const waitlistStatus = z.enum([
  "WAITING",
  "NOTIFIED",
  "LEFT",
  "FULFILLED",
  "CLOSED",
]);
const entry = z.object({
  id: z.uuid(),
  ticketTierId: z.uuid(),
  status: waitlistStatus,
  joinedAt: z.string(),
  lastNotifiedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const eligibility = z.object({
  saleState: z.enum([
    "OPEN",
    "SOLD_OUT",
    "UPCOMING",
    "PAUSED",
    "CLOSED",
    "UNAVAILABLE",
  ]),
  availableQuantity: z.number().int().nonnegative(),
  canJoin: z.boolean(),
  canLeave: z.boolean(),
  reason: z.string().nullable(),
  cooldownUntil: z.string().nullable(),
  notice: z.string(),
  serverTime: z.string(),
});
const membership = eligibility.extend({
  eventId: z.uuid(),
  tierId: z.uuid(),
  entry: entry.nullable(),
});
export type WaitlistMembership = z.infer<typeof membership>;
const row = entry.extend({
  ...eligibility.shape,
  event: z.object({
    id: z.uuid(),
    title: z.string(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    startAt: z.string(),
    venue: z.string(),
    city: z.string(),
    canView: z.boolean(),
  }),
  tier: z.object({
    id: z.uuid(),
    name: z.string(),
    pricePaisa: z.number().int().nonnegative(),
  }),
});
export type WaitlistRow = z.infer<typeof row>;
export const waitlistFilters = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    status: waitlistStatus.optional(),
  })
  .strict();
const path = (eventId: string, tierId: string) =>
  `/api/events/${eventId}/ticket-tiers/${tierId}/waitlist`;
export const getWaitlistMembership = (eventId: string, tierId: string) =>
  apiClient(path(eventId, tierId), membership);
export const joinWaitlist = (eventId: string, tierId: string) =>
  apiClient(path(eventId, tierId), membership, {
    method: "PUT",
    ...jsonBody({}),
  });
export const leaveWaitlist = (eventId: string, tierId: string) =>
  apiClient(path(eventId, tierId), z.object({ left: z.literal(true) }), {
    method: "DELETE",
    ...jsonBody({}),
  });
export const getWaitlists = (params: URLSearchParams) =>
  apiList("/api/users/me/waitlists?" + params, row);
