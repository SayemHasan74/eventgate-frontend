import { z } from "zod";
import { apiClient, apiList, jsonBody } from "./api-client";
import { refundSchema } from "./api-schemas";
export { ApiError as RefundApiError } from "./api-error";
export type Refund = z.infer<typeof refundSchema>;
export const requestRefund = (orderId: string, userMessage?: string) =>
  apiClient(
    "/api/refunds/orders/" + encodeURIComponent(orderId) + "/refund-requests",
    refundSchema,
    {
      method: "POST",
      ...jsonBody(
        userMessage?.trim() ? { userMessage: userMessage.trim() } : {},
      ),
    },
  );
export async function getRefunds(filters = new URLSearchParams()) {
  const result = await apiList(
    "/api/refunds/refund-requests?" + filters,
    refundSchema,
  );
  return { refunds: result.data, total: result.meta.total, meta: result.meta };
}
