import { z } from "zod";
import { apiClient } from "./api-client";
import {
  orderStatusSchema,
  refundStatusSchema,
  moneySchema,
} from "./api-schemas";
const timestamp = z.iso.datetime({ offset: true });
export const overviewSchema = z.object({
  ordersByStatus: z.partialRecord(
    orderStatusSchema,
    z.number().int().nonnegative(),
  ),
  activeTickets: z.number().int().nonnegative(),
  refundRequests: z.number().int().nonnegative(),
  activeHoldsCount: z.number().int().nonnegative(),
  serverTime: timestamp,
  upcomingTickets: z
    .array(
      z.object({
        id: z.uuid(),
        orderId: z.uuid(),
        event: z.object({
          id: z.uuid(),
          title: z.string(),
          slug: z.string(),
          venue: z.string(),
          city: z.string(),
          startAt: timestamp,
          endAt: timestamp,
        }),
      }),
    )
    .max(5),
  recentOrders: z
    .array(
      z.object({
        id: z.uuid(),
        status: orderStatusSchema,
        eventNameSnapshot: z.string(),
        ticketTierNameSnapshot: z.string(),
        quantity: z.number().int().positive(),
        totalAmountPaisaSnapshot: moneySchema,
        currency: z.literal("BDT"),
        createdAt: timestamp,
      }),
    )
    .max(5),
  activeHolds: z
    .array(
      z.object({
        id: z.uuid(),
        eventNameSnapshot: z.string(),
        ticketTierNameSnapshot: z.string(),
        quantity: z.number().int().positive(),
        totalAmountPaisaSnapshot: moneySchema,
        reservationExpiresAt: timestamp,
      }),
    )
    .max(5),
  refundAttention: z
    .array(
      z.object({
        id: z.uuid(),
        orderId: z.uuid(),
        status: refundStatusSchema,
        amountPaisa: moneySchema,
        requestedAt: timestamp,
        order: z.object({ eventNameSnapshot: z.string() }),
      }),
    )
    .max(5),
});
export const getAccountOverview = () =>
  apiClient("/api/users/me/overview", overviewSchema);
