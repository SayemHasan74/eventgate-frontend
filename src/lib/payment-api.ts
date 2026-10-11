import { apiClient } from "./api-client";
import { checkoutSchema, paymentAttemptSchema } from "./api-schemas";
export { ApiError as PaymentApiError } from "./api-error";
export const startCheckout = (orderId: string, key: string) =>
  apiClient(
    "/api/payments/orders/" + encodeURIComponent(orderId) + "/checkout",
    checkoutSchema,
    { method: "POST", headers: { "Idempotency-Key": key } },
  );
export const getPaymentAttempt = (attemptId: string) =>
  apiClient(
    "/api/payments/attempts/" + encodeURIComponent(attemptId),
    paymentAttemptSchema,
  );
