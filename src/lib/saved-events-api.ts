import { z } from "zod";
import { apiClient, apiList, jsonBody, ApiError } from "./api-client";
const saved = z.object({
  id: z.uuid(),
  eventId: z.uuid(),
  createdAt: z.string(),
  saleReminderEnabled: z.boolean(),
  eventReminderEnabled: z.boolean(),
});
const membership = z.object({
  eventId: z.uuid(),
  saved: saved.nullable(),
  canSave: z.boolean(),
  serverTime: z.string(),
});
const tier = z.object({
  id: z.uuid(),
  name: z.string(),
  pricePaisa: z.number().int().nonnegative(),
  salesStartAt: z.string(),
  salesEndAt: z.string(),
  saleState: z.enum([
    "OPEN",
    "UPCOMING",
    "PAUSED",
    "SOLD_OUT",
    "CLOSED",
    "UNAVAILABLE",
  ]),
  availableQuantity: z.number().int().nonnegative(),
});
const row = saved.extend({
  serverTime: z.string(),
  event: z.object({
    id: z.uuid(),
    title: z.string(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    startAt: z.string(),
    endAt: z.string(),
    status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]),
    deletedAt: z.string().nullable(),
    venue: z.string(),
    city: z.string(),
    imageUrl: z.string().nullable(),
    canView: z.boolean(),
    canBuy: z.boolean(),
    ticketTiers: z.array(tier),
  }),
});
export type SavedEventRow = z.infer<typeof row>;
export const reminderChoices = z.object({
  saleReminderEnabled: z.boolean(),
  eventReminderEnabled: z.boolean(),
});
export type ReminderChoices = z.infer<typeof reminderChoices>;
export const savedFilters = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    period: z.enum(["all", "upcoming", "past"]).default("all"),
  })
  .strict();
type Membership = z.infer<typeof membership>;
type WaitingMembership = {
  eventId: string;
  resolve: (value: Membership) => void;
  reject: (reason: unknown) => void;
};
const membershipQueues = new Map<string, WaitingMembership[]>();
// Cards mount together. Coalesce their reads while keeping each attendee's query cache separate.
export function getSavedMembership(eventId: string, userId: string) {
  return new Promise<Membership>((resolve, reject) => {
    const queue = membershipQueues.get(userId);
    const item = { eventId, resolve, reject };
    if (queue) {
      queue.push(item);
      return;
    }
    membershipQueues.set(userId, [item]);
    setTimeout(() => {
      const waiting = membershipQueues.get(userId)!;
      membershipQueues.delete(userId);
      for (let offset = 0; offset < waiting.length; offset += 100) {
        const group = waiting.slice(offset, offset + 100);
        const eventIds = [...new Set(group.map((request) => request.eventId))];
        void apiClient(
          "/api/saved-events/memberships?" +
            new URLSearchParams({ eventIds: eventIds.join(",") }),
          z.array(membership),
        )
          .then((rows) => {
            const byId = new Map(rows.map((row) => [row.eventId, row]));
            for (const request of group) {
              const row = byId.get(request.eventId);
              if (row) request.resolve(row);
              else
                request.reject(
                  new Error("Saved state was not returned. Please retry."),
                );
            }
          })
          .catch((error) => {
            // Support frontend/backend rolling deployments without hiding real server failures.
            if (
              error instanceof ApiError &&
              (error.status === 404 ||
                (error.status === 400 &&
                  error.errors.some((issue) => issue.field === "eventId")))
            ) {
              for (const request of group)
                void apiClient(
                  `/api/saved-events/${request.eventId}`,
                  membership,
                ).then(request.resolve, request.reject);
            } else for (const request of group) request.reject(error);
          });
      }
    }, 0);
  });
}
export const saveEvent = (eventId: string, choices?: ReminderChoices) =>
  apiClient(`/api/saved-events/${eventId}`, membership, {
    method: "PUT",
    ...jsonBody(choices ?? {}),
  });
export const removeSavedEvent = (eventId: string) =>
  apiClient(
    `/api/saved-events/${eventId}`,
    z.object({ removed: z.literal(true) }),
    { method: "DELETE", ...jsonBody({}) },
  );
export const getSavedEvents = (params: URLSearchParams, signal?: AbortSignal) =>
  apiList("/api/saved-events?" + params, row, { signal });
