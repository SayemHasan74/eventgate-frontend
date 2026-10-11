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
    .max(500000),
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
export const checkoutSchema = z.object({
  paymentAttemptId: z.uuid(),
  merchantTransactionId: z.string(),
  checkoutUrl: checkoutUrlSchema,
});
