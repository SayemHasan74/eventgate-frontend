import { z } from "zod";
import { apiClient, apiList, jsonBody } from "./api-client";
import { refundSchema } from "./api-schemas";
export { ApiError as AdminRefundApiError } from "./api-error";
export type AdminRefund = z.infer<typeof refundSchema>;
export async function getAdminRefunds(filters = new URLSearchParams()) {
  const result = await apiList(
    "/api/refunds/admin/refunds?" + filters,
    refundSchema,
  );
  return { refunds: result.data, total: result.meta.total, meta: result.meta };
}
export const reviewAdminRefund = (
  id: string,
  decision: "approve" | "reject",
  reviewerNote?: string,
) =>
  apiClient(
    "/api/refunds/admin/refunds/" + encodeURIComponent(id),
    refundSchema,
    {
      method: "PATCH",
      ...jsonBody({
        decision,
        ...(reviewerNote?.trim() ? { reviewerNote: reviewerNote.trim() } : {}),
      }),
    },
  );
export const retryAdminRefund = (id: string, reason: string) =>
  apiClient(
    "/api/refunds/admin/refunds/" + encodeURIComponent(id) + "/retry",
    z.null(),
    { method: "POST", ...jsonBody({ reason }) },
  );
