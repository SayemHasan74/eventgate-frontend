import { z } from "zod";
import { dhakaDayBounds } from "./format";
const optionalText = (max: number) => z.string().trim().max(max).optional();
const page = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER)
  .default(1);
export const listFilterSchema = z.object({
  page,
  search: optionalText(120),
  status: optionalText(40),
});
export const eventListFilterSchema = listFilterSchema.extend({
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]).optional(),
});
const orderStatusFilterSchema = listFilterSchema.extend({
  status: z
    .enum(["PENDING_PAYMENT", "PAID", "REFUNDED", "CANCELLED", "EXPIRED"])
    .optional(),
});
export const userListFilterSchema = listFilterSchema.extend({
  role: z.enum(["ATTENDEE", "ORGANIZER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});
export const auditListFilterSchema = listFilterSchema.extend({
  search: optionalText(160),
});
export const ticketWalletFilterSchema = listFilterSchema.extend({
  period: z.enum(["upcoming", "past", "all"]).default("upcoming"),
  status: z.enum(["ACTIVE", "CHECKED_IN", "VOIDED", "REFUNDED"]).optional(),
});
export const refundListFilterSchema = listFilterSchema.extend({
  status: z
    .enum([
      "REQUESTED",
      "APPROVED",
      "REJECTED",
      "PROCESSING",
      "SUCCEEDED",
      "FAILED",
      "UNKNOWN",
    ])
    .optional(),
});
const day = z
  .string()
  .refine((value) => {
    try {
      dhakaDayBounds(value);
      return true;
    } catch {
      return false;
    }
  }, "Enter a valid Bangladesh date.")
  .optional();
export const orderListFilterSchema = orderStatusFilterSchema
  .extend({ startDate: day, endDate: day })
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.startDate <= value.endDate,
    { path: ["endDate"], message: "End date must be on or after start date." },
  );
export const discoveryFilterSchema = listFilterSchema
  .omit({ status: true })
  .extend({
    city: optionalText(100),
    category: optionalText(80),
    sort: z.enum(["soonest", "latest", "newest", "title"]).default("soonest"),
    startDate: day,
    endDate: day,
  })
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.startDate <= value.endDate,
    { path: ["endDate"], message: "End date must be on or after start date." },
  );
export const managedEventFilterSchema = eventListFilterSchema
  .extend({ startDate: day, endDate: day })
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.startDate <= value.endDate,
    { path: ["endDate"], message: "End date must be on or after start date." },
  );
export function nonEmptyParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
) {
  const entries =
    params instanceof URLSearchParams
      ? [...params.entries()]
      : Object.entries(params);
  return Object.fromEntries(
    entries
      .map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ])
      .filter(([, value]) => value !== undefined && value !== ""),
  );
}
