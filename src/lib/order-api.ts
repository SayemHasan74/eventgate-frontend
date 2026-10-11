import { apiClient, apiList, jsonBody } from "./api-client";
import { z } from "zod";
import { orderSchema } from "./api-schemas";
export { ApiError as OrderApiError } from "./api-error";
export type Order = z.infer<typeof orderSchema>;
export const reserveTickets = (ticketTierId: string, quantity: number) =>
  apiClient("/api/orders", orderSchema, {
    method: "POST",
    ...jsonBody({ ticketTierId, quantity }),
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
  });
export const getOrder = (orderId: string) =>
  apiClient("/api/orders/" + encodeURIComponent(orderId), orderSchema);
export async function getOrders(filters = new URLSearchParams()) {
  const result = await apiList("/api/orders?" + filters, orderSchema);
  return { orders: result.data, meta: result.meta };
}
export const cancelOrder = (orderId: string) =>
  apiClient(
    "/api/orders/" + encodeURIComponent(orderId) + "/cancel",
    z.null(),
    { method: "POST" },
  );
