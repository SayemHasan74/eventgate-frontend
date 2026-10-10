export type Refund = {
  id: string;
  orderId: string;
  paymentAttemptId: string;
  requestedById: string;
  reviewedById: string | null;
  reason: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "UNKNOWN";
  amountPaisa: number;
  currency: string;
  requestedAt: string;
  reviewedAt: string | null;
  processedAt: string | null;
  completedAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
};

type ApiResponse<T> = { success: true; data: T };
type ApiError = { message?: string; errors?: Array<{ message?: string }> };
export class RefundApiError extends Error {}

async function refundRequest<T>(accessToken: string, path: string, method: "GET" | "POST") {
  const response = await fetch(`/api/refunds/${path}`, { method, headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T> & { meta?: { total: number } } | ApiError;
  if (!response.ok || !("success" in payload) || !payload.success || !("data" in payload)) {
    const error = payload as ApiError;
    throw new RefundApiError(error.errors?.[0]?.message ?? error.message ?? "Your refund request could not be completed.");
  }
  return payload;
}

export const requestRefund = async (accessToken: string, orderId: string) => (await refundRequest<Refund>(accessToken, `orders/${orderId}/refund-requests`, "POST")).data;
export const getRefunds = async (accessToken: string) => { const result = await refundRequest<Refund[]>(accessToken, "refund-requests", "GET"); return { refunds: result.data, total: result.meta?.total ?? result.data.length }; };
