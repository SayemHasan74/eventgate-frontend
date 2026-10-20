import { z } from "zod";
import { apiClient, apiList, jsonBody } from "./api-client";
const localPath = z
  .string()
  .max(300)
  .refine(
    (path) =>
      /^\/(?:account(?:\/profile)?|organizer|notifications|saved-events|waitlists)$/.test(
        path,
      ) ||
      /^\/(?:orders|refunds|tickets)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        path,
      ) ||
      /^\/events\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path) ||
      /^\/events\/[a-z0-9]+(?:-[a-z0-9]+)*\/tickets\?tierId=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        path,
      ),
    "Unsafe notification destination",
  );
const notification = z.object({
  id: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  actionPath: localPath,
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export const notificationFilters = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    read: z.enum(["all", "unread", "read"]).default("all"),
    type: z
      .string()
      .regex(/^[A-Z_]{1,80}$/)
      .optional(),
  })
  .strict();
export const preferenceFields = z.object({
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  bookingUpdates: z.boolean(),
  savedEventReminders: z.boolean(),
  waitlistAlerts: z.boolean(),
  marketingEmail: z.boolean(),
  personalizedEmail: z.boolean(),
});
const preferences = preferenceFields.extend({
  emailVerifiedAt: z.string().nullable(),
  emailAvailable: z.boolean(),
  emailConfigurationMessage: z.string().nullable(),
});
export type PreferenceFields = z.infer<typeof preferenceFields>;
export type Preferences = z.infer<typeof preferences>;
export const getNotifications = (params: URLSearchParams) =>
  apiList("/api/notifications?" + params, notification);
export const readNotification = (id?: string) =>
  apiClient(
    "/api/notifications/" + (id ? `${id}/read` : "read-all"),
    z.object({ updated: z.number().int().nonnegative() }),
    { method: id ? "PATCH" : "POST", ...jsonBody({}) },
  );
export const getNotificationPreferences = () =>
  apiClient("/api/users/me/notification-preferences", preferences);
export const saveNotificationPreferences = (input: PreferenceFields) =>
  apiClient("/api/users/me/notification-preferences", preferences, {
    method: "PATCH",
    ...jsonBody(input),
  });
export const requestVerification = () =>
  apiClient(
    "/api/users/me/email-verification",
    z.object({ message: z.string() }),
    { method: "POST", ...jsonBody({}) },
  );
export const confirmVerification = (token: string) =>
  apiClient(
    "/api/users/me/email-verification/confirm",
    z.object({ verified: z.literal(true) }),
    { method: "POST", ...jsonBody({ token }) },
  );
const incident = z.object({
  id: z.string().uuid(),
  state: z.enum(["FAILED", "UNKNOWN"]),
  channel: z.literal("EMAIL"),
  attempts: z.number().int(),
  nextAttemptAt: z.string().nullable(),
  firstAttemptAt: z.string().nullable(),
  error: z.string().nullable(),
  providerMessageId: z.string().nullable(),
  createdAt: z.string(),
  notification: z.object({
    type: z.string(),
    title: z.string(),
    userId: z.string().uuid(),
  }),
});
export const getEmailIncidents = (page: number) =>
  apiList(
    `/api/admin/reports/notification-deliveries?page=${page}&limit=20`,
    incident,
  );

export const getUnreadCount = () =>
  apiClient(
    "/api/notifications/unread-count",
    z.object({ unread: z.number().int().nonnegative() }),
  );
