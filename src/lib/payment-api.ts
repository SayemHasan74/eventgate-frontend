type CheckoutSession = { paymentAttemptId: string; merchantTransactionId: string; checkoutUrl: string };
type ApiResponse<T> = { success: true; data: T };
type ApiError = { message?: string; errors?: Array<{ message?: string }> };
export class PaymentApiError extends Error {}

export async function startCheckout(accessToken: string, orderId: string) {
  const response = await fetch(`/api/payments/orders/${orderId}/checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Idempotency-Key": crypto.randomUUID() },
  });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<CheckoutSession> | ApiError;
  if (!response.ok || !("success" in payload) || !payload.success || !("data" in payload)) {
    const error = payload as ApiError;
    throw new PaymentApiError(error.errors?.[0]?.message ?? error.message ?? "Could not start payment.");
  }
  return payload.data;
}
