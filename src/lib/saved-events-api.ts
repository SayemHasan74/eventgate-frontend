import { z } from "zod";
import { apiClient, apiList, jsonBody } from "./api-client";
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
export const getSavedMembership = (eventId: string) =>
  apiClient(`/api/saved-events/${eventId}`, membership);
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
export const getSavedEvents = (params: URLSearchParams) =>
  apiList("/api/saved-events?" + params, row);
