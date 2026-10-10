export type AdminRefund = {
  id: string;
  orderId: string;
  status: "REQUESTED" | "APPROVED" | "PROCESSING" | "SUCCEEDED" | "REJECTED" | "FAILED" | "UNKNOWN";
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

async function request<T>(accessToken: string, path: string, method: "GET" | "POST" | "PATCH", body?: unknown) {
  const response = await fetch(`/api/refunds/${path}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T> | ApiError;
  if (!response.ok || !("success" in payload) || !payload.success || !("data" in payload)) {
    const error = payload as ApiError;
    throw new AdminRefundApiError(error.errors?.[0]?.message ?? error.message ?? "The refund action could not be completed.");
  }
  return payload as ApiResponse<T>;
}

export async function getAdminRefunds(accessToken: string) {
  const result = await request<AdminRefund[]>(accessToken, "admin/refunds", "GET");
  return { refunds: result.data, total: result.meta?.total ?? result.data.length };
}

export const reviewAdminRefund = (accessToken: string, refundId: string, decision: "approve" | "reject") =>
  request<AdminRefund>(accessToken, `admin/refunds/${refundId}`, "PATCH", { decision }).then((result) => result.data);

export const retryAdminRefund = (accessToken: string, refundId: string) =>
  request<null>(accessToken, `admin/refunds/${refundId}/retry`, "POST").then((result) => result.data);
