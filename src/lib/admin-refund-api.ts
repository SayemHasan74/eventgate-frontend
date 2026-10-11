import { sessionFetch } from "./session-fetch";

export type AdminRefund = {
  id: string;
  orderId: string;
  status:
    | "REQUESTED"
    | "APPROVED"
    | "PROCESSING"
    | "SUCCEEDED"
    | "REJECTED"
    | "FAILED"
    | "UNKNOWN";
  reason: string;
  amountPaisa: number;
  currency: string;
  requestedAt: string;
  reviewedAt: string | null;
  processedAt: string | null;
  completedAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
};

type ApiResponse<T> = { success: true; data: T; meta?: { total?: number } };
type ApiError = { message?: string; errors?: Array<{ message?: string }> };
export class AdminRefundApiError extends Error {}

async function request<T>(
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
) {
  const response = await sessionFetch(`/api/refunds/${path}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = (await response.json().catch(() => ({}))) as
    ApiResponse<T> | ApiError;
  if (
    !response.ok ||
    !("success" in payload) ||
    !payload.success ||
    !("data" in payload)
  ) {
    const error = payload as ApiError;
    throw new AdminRefundApiError(
      error.errors?.[0]?.message ??
        error.message ??
        "The refund action could not be completed.",
    );
  }
  return payload as ApiResponse<T>;
}

export async function getAdminRefunds() {
  const result = await request<AdminRefund[]>("admin/refunds", "GET");
  return {
    refunds: result.data,
    total: result.meta?.total ?? result.data.length,
  };
}

export const reviewAdminRefund = (
  refundId: string,
  decision: "approve" | "reject",
) =>
  request<AdminRefund>(`admin/refunds/${refundId}`, "PATCH", { decision }).then(
    (result) => result.data,
  );

export const retryAdminRefund = (refundId: string) =>
  request<null>(`admin/refunds/${refundId}/retry`, "POST").then(
    (result) => result.data,
  );
