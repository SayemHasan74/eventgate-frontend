import { apiClient, apiList, jsonBody } from "./api-client";
import { z } from "zod";
import { orderSchema, orderDetailSchema } from "./api-schemas";
import { clearBookingIntent } from "./booking-intent";
import {
  operationKey,
  clearOperationKey,
  definitiveFailure,
} from "./operation-keys";
export { ApiError as OrderApiError } from "./api-error";
export type Order = z.infer<typeof orderSchema>;
export type OrderDetail = z.infer<typeof orderDetailSchema>;
export const reserveTickets = async (
  ticketTierId: string,
  quantity: number,
  userId: string,
) => {
  const resource = `${ticketTierId}:${quantity}`;
  const key = operationKey("order", userId, resource);
  try {
    const order = await apiClient("/api/orders", orderSchema, {
      method: "POST",
      ...jsonBody({ ticketTierId, quantity }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
    });
    clearOperationKey("order", userId, resource);
    return order;
  } catch (error) {
    if (definitiveFailure(error)) clearOperationKey("order", userId, resource);
    throw error;
  }
};
export const getOrder = (orderId: string) =>
  apiClient("/api/orders/" + encodeURIComponent(orderId), orderDetailSchema);
export async function getOrders(filters = new URLSearchParams()) {
  const result = await apiList("/api/orders?" + filters, orderSchema);
  return { orders: result.data, meta: result.meta };
}
export const cancelOrder = async (orderId: string) => {
  const result = await apiClient(
    "/api/orders/" + encodeURIComponent(orderId) + "/cancel",
    z.null(),
    { method: "POST" },
  );
  clearBookingIntent();
  return result;
};
