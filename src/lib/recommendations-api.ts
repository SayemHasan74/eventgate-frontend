import { z } from "zod";
import { apiClient, jsonBody } from "./api-client";
import { publicEventSchema } from "./public-event-schema";
export const eventPreferenceFields = z.object({
  preferredCity: z.string().trim().max(100),
  preferredCategories: z
    .array(z.string().min(1).max(80))
    .max(5, "Choose at most five categories."),
  personalizationEnabled: z.boolean(),
});
const preferenceSchema = eventPreferenceFields.extend({
  preferredCity: z.string().nullable(),
  options: z.object({
    categories: z.array(z.string()),
    cities: z.array(z.string()),
  }),
});
export type EventPreferences = z.infer<typeof preferenceSchema>;
export type EventPreferenceFields = z.infer<typeof eventPreferenceFields>;
export const getEventPreferences = () =>
  apiClient("/api/users/me/event-preferences", preferenceSchema, {
    cache: "no-store",
  });
export const saveEventPreferences = (values: EventPreferenceFields) =>
  apiClient("/api/users/me/event-preferences", preferenceSchema, {
    method: "PATCH",
    ...jsonBody({ ...values, preferredCity: values.preferredCity || null }),
  });
export const getRecommendations = () =>
  apiClient(
    "/api/events/recommended?limit=6",
    z.object({
      heading: z.enum(["Chosen for you", "Upcoming events"]),
      personalized: z.boolean(),
      serverTime: z.iso.datetime({ offset: true }),
      events: z
        .array(
          z.object({
            event: publicEventSchema,
            canPurchase: z.boolean(),
            reason: z
              .enum([
                "Matches your preferred category",
                "In your preferred city",
                "Similar to your saved events",
              ])
              .nullable(),
          }),
        )
        .max(12),
    }),
    { cache: "no-store" },
  );
