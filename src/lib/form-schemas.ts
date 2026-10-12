import { z } from "zod";
import { dhakaLocalToUtc, bdtToPaisa } from "./format";

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(12, "Use at least 12 characters.")
    .max(128, "Use at most 128 characters."),
});
export const registrationSchema = signInSchema.extend({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter at least two characters.")
    .max(120),
});
const localDate = z.string().refine((value) => {
  try {
    dhakaLocalToUtc(value);
    return true;
  } catch {
    return false;
  }
}, "Enter a valid Bangladesh date and time.");
export const eventFieldsSchema = z.object({
  title: z.string().trim().min(3).max(180),
  slug: z
    .string()
    .trim()
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase words separated by hyphens.",
    ),
  description: z.string().trim().min(20),
  category: z.string().trim().min(2).max(80),
  venue: z.string().trim().min(2).max(160),
  city: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5),
  startAt: localDate,
  endAt: localDate,
  imageUrl: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    }, "Use a valid HTTPS image URL."),
});
export const eventFormSchema = eventFieldsSchema.superRefine((value, ctx) => {
  try {
    const start = Date.parse(dhakaLocalToUtc(value.startAt));
    const end = Date.parse(dhakaLocalToUtc(value.endAt));
    if (start <= Date.now())
      ctx.addIssue({
        code: "custom",
        path: ["startAt"],
        message: "Start must be in the future.",
      });
    if (end <= start)
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "End must be after the start.",
      });
  } catch {
    /* Date fields already carry their validation messages. */
  }
});
export const publishedEventFormSchema = eventFieldsSchema;
export const tierFormSchema = (
  eventStart?: string,
  options: {
    requireFutureStart?: boolean;
    minimumCapacity?: number;
    futureEnd?: boolean;
  } = {},
) =>
  z
    .object({
      name: z.string().trim().min(2).max(100),
      price: z.string().refine((value) => {
        try {
          return bdtToPaisa(value) <= 2147483647;
        } catch {
          return false;
        }
      }, "Enter a positive BDT amount with at most two decimals."),
      capacity: z
        .number()
        .int()
        .min(Math.max(1, options.minimumCapacity ?? 1))
        .max(2147483647),
      salesPaused: z.boolean(),
      salesStartAt: localDate,
      salesEndAt: localDate,
    })
    .superRefine((value, ctx) => {
      try {
        const start = Date.parse(dhakaLocalToUtc(value.salesStartAt));
        const end = Date.parse(dhakaLocalToUtc(value.salesEndAt));
        if ((options.requireFutureStart ?? true) && start <= Date.now())
          ctx.addIssue({
            code: "custom",
            path: ["salesStartAt"],
            message: "Sales must start in the future.",
          });
        if (end <= start)
          ctx.addIssue({
            code: "custom",
            path: ["salesEndAt"],
            message: "Sales must end after they start.",
          });
        if (options.futureEnd && end <= Date.now())
          ctx.addIssue({
            code: "custom",
            path: ["salesEndAt"],
            message: "Reopening sales requires a future end time.",
          });
        if (eventStart && end > Date.parse(eventStart))
          ctx.addIssue({
            code: "custom",
            path: ["salesEndAt"],
            message: "Sales must end no later than the event start.",
          });
      } catch {
        /* Date fields already carry their validation messages. */
      }
    });
export const profileFormSchema = z.object({
  phone: z.string().trim().min(6).max(30),
  address: z.string().trim().min(5).max(500),
  city: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(3).max(20),
  country: z.string().trim().min(2).max(100),
});
export const refundMessageSchema = z.object({
  userMessage: z.string().trim().max(1000),
});
export const accountProfileFormSchema = profileFormSchema.extend({
  displayName: z.string().trim().min(2).max(120),
  phone: profileFormSchema.shape.phone.or(z.literal("")),
  address: profileFormSchema.shape.address.or(z.literal("")),
  city: profileFormSchema.shape.city.or(z.literal("")),
  postalCode: profileFormSchema.shape.postalCode.or(z.literal("")),
  country: profileFormSchema.shape.country.or(z.literal("")),
});
export const refundReviewSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    reviewerNote: z.string().trim().min(5).max(1000),
  })
  .refine((value) => value.decision !== "reject" || !!value.reviewerNote, {
    path: ["reviewerNote"],
    message: "Explain why this refund is rejected.",
  });
export const checkInFormSchema = z.object({
  qrToken: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9_-]{43}$/,
      "Use the opaque EventGate QR token, not a URL.",
    ),
});
export const userMutationSchema = z.discriminatedUnion("path", [
  z.object({
    path: z.literal("role"),
    role: z.enum(["ATTENDEE", "ORGANIZER"]),
    reason: z.string().trim().min(5).max(1000),
  }),
  z.object({
    path: z.literal("status"),
    status: z.enum(["ACTIVE", "SUSPENDED"]),
    reason: z.string().trim().min(5).max(1000),
  }),
]);
