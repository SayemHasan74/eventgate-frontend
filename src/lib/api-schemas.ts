import { z } from "zod";
export const moneySchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
export const orderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "PAID",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
]);
export const ticketStatusSchema = z.enum([
  "ACTIVE",
  "CHECKED_IN",
  "VOIDED",
  "REFUNDED",
]);
export const paymentStatusSchema = z.enum([
  "INITIATING",
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "UNKNOWN",
]);
export const refundStatusSchema = z.enum([
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "UNKNOWN",
]);
const timestamp = z.iso.datetime({ offset: true });
export const orderSchema = z
  .object({
    id: z.uuid(),
    eventId: z.uuid(),
    ticketTierId: z.uuid(),
    eventNameSnapshot: z.string(),
    ticketTierNameSnapshot: z.string(),
    unitPricePaisaSnapshot: moneySchema,
    quantity: z.number().int().min(1).max(10),
    totalAmountPaisaSnapshot: moneySchema,
    currency: z.literal("BDT"),
    status: orderStatusSchema,
    reservationExpiresAt: timestamp.nullable(),
    reservationReleasedAt: timestamp.nullable(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .refine(
    (order) =>
      order.totalAmountPaisaSnapshot ===
      order.unitPricePaisaSnapshot * order.quantity,
  );
export const ticketSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  eventId: z.uuid(),
  ticketTierId: z.uuid(),
  sequence: z.number().int().positive(),
  status: ticketStatusSchema,
  checkedInAt: timestamp.nullable(),
  createdAt: timestamp,
  event: z.object({
    title: z.string(),
    slug: z.string(),
    venue: z.string(),
    city: z.string(),
    startAt: timestamp,
    endAt: timestamp,
  }),
  ticketTier: z.object({ name: z.string() }),
});
export const qrSchema = z.object({
  ticketId: z.uuid(),
  mimeType: z.literal("image/png"),
  dataUrl: z
    .string()
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/)
    .max(500000)
    .refine((value) => {
      try {
        const bytes = Uint8Array.from(atob(value.split(",")[1]), (char) =>
          char.charCodeAt(0),
        );
        if (bytes.length < 45) return false;
        const signature = [137, 80, 78, 71, 13, 10, 26, 10];
        if (!signature.every((byte, index) => bytes[index] === byte))
          return false;
        const view = new DataView(bytes.buffer);
        return (
          view.getUint32(8) === 13 &&
          view.getUint32(12) === 0x49484452 &&
          view.getUint32(16) > 0 &&
          view.getUint32(16) <= 4096 &&
          view.getUint32(20) > 0 &&
          view.getUint32(20) <= 4096 &&
          view.getUint32(bytes.length - 12) === 0 &&
          view.getUint32(bytes.length - 8) === 0x49454e44
        );
      } catch {
        return false;
      }
    }, "Invalid PNG pass."),
});
export const refundSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  paymentAttemptId: z.uuid().nullable(),
  requestedById: z.uuid().nullable(),
  reviewedById: z.uuid().nullable(),
  reason: z.string(),
  status: refundStatusSchema,
  amountPaisa: moneySchema,
  currency: z.literal("BDT"),
  requestedAt: timestamp,
  reviewedAt: timestamp.nullable(),
  processedAt: timestamp.nullable(),
  completedAt: timestamp.nullable(),
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
  userMessage: z.string().nullable().optional(),
  reviewerNote: z.string().nullable().optional(),
  requestCount: z.number().int().min(1).max(3).optional(),
  needsInvestigation: z.boolean().default(false),
  activities: z
    .array(
      z.object({
        id: z.uuid(),
        action: z.string(),
        note: z.string().nullable(),
        createdAt: timestamp,
      }),
    )
    .default([]),
});
export const paymentAttemptSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  merchantTransactionId: z.string(),
  amountPaisa: moneySchema,
  currency: z.literal("BDT"),
  status: paymentStatusSchema,
  initiatedAt: timestamp,
  completedAt: timestamp.nullable(),
});
export const orderDetailSchema = orderSchema.and(
  z.object({
    serverTime: timestamp,
    payable: z.boolean(),
    cancellable: z.boolean(),
    financialReviewRequired: z.boolean(),
    ticketIds: z.array(z.uuid()),
    event: z.object({
      slug: z.string(),
      startAt: timestamp,
      status: z.string(),
    }),
    paymentAttempts: z.array(paymentAttemptSchema),
  }),
);
export const checkoutUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return (
    url.protocol === "https:" &&
    (!url.port || url.port === "443") &&
    !url.hash &&
    !url.username &&
    !url.password &&
    ["sandbox.sslcommerz.com", "securepay.sslcommerz.com"].includes(
      url.hostname,
    ) &&
    ![...url.searchParams.keys()].some((key) =>
      /(passwd|password|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|credential)/i.test(
        key,
      ),
    )
  );
}, "Payment address is not trusted.");
export const checkoutSchema = z.union([
  z.object({
    status: z.literal("AVAILABLE").default("AVAILABLE"),
    paymentAttemptId: z.uuid(),
    merchantTransactionId: z.string(),
    checkoutUrl: checkoutUrlSchema,
    checkoutExpiresAt: timestamp.optional(),
  }),
  z
    .object({
      status: z.enum(["PROCESSING", "UNKNOWN"]),
      paymentAttemptId: z.uuid(),
      merchantTransactionId: z.string(),
      paymentStatus: paymentStatusSchema,
      statusPath: z.string(),
    })
    .refine(
      (value) =>
        value.statusPath ===
        `/api/v1/payments/attempts/${value.paymentAttemptId}`,
    ),
]);
