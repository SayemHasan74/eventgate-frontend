import type { OrderDetail } from "./order-api";
export function paymentReturnState(order: OrderDetail) {
  if (order.financialReviewRequired)
    return {
      state: "unknown",
      terminal: false,
      title: "Payment needs reconciliation",
      message:
        "A financial review is required. Do not pay again while the outcome is uncertain.",
    };
  if (
    order.status === "PAID" &&
    order.ticketIds.length === order.quantity &&
    order.paymentAttempts.some(
      (attempt) =>
        attempt.id === order.fulfilledPaymentAttemptId &&
        attempt.status === "SUCCEEDED" &&
        attempt.amountPaisa === order.totalAmountPaisaSnapshot,
    )
  )
    return {
      state: "paid",
      terminal: true,
      title: "Your tickets are ready",
      message: "The backend verified payment and issued your passes.",
    };
  if (order.status === "REFUNDED")
    return {
      state: "refunded",
      terminal: true,
      title: "Booking refunded",
      message: "The provider confirmed this booking's refund.",
    };
  const captured = order.paymentAttempts.filter(
    (attempt) => attempt.status === "SUCCEEDED",
  );
  if (captured.length && order.status !== "PAID") {
    if (
      order.status === "PENDING_PAYMENT" &&
      !order.refunds.some((refund) =>
        captured.some((attempt) => attempt.id === refund.paymentAttemptId),
      )
    )
      return {
        state: "verifying",
        terminal: false,
        title: "Confirming your booking",
        message:
          "A capture is verified. Refreshing the order to confirm ticket fulfillment or any required refund; do not pay again.",
      };
    const refunded = captured.every((attempt) =>
      order.refunds.some(
        (refund) =>
          refund.paymentAttemptId === attempt.id &&
          refund.status === "SUCCEEDED",
      ),
    );
    return {
      state: refunded ? "refunded" : "refund-pending",
      terminal: refunded,
      title: refunded ? "Capture refunded" : "Payment captured; refund pending",
      message: refunded
        ? "The captured payment has a confirmed provider refund."
        : "Payment was verified but this reservation was not fulfilled. Follow refund processing on this order; do not pay again.",
    };
  }
  const latest = order.paymentAttempts[0];
  if (latest?.status === "UNKNOWN")
    return {
      state: "unknown",
      terminal: false,
      title: "Payment outcome is unknown",
      message:
        "Verification is still required. This is not proof of failure; do not make another payment.",
    };
  if (latest && ["INITIATING", "PENDING"].includes(latest.status))
    return {
      state: "verifying",
      terminal: false,
      title: "Verifying your payment",
      message:
        "Waiting for the provider and backend to confirm the existing attempt. A cancel return can race a successful payment.",
    };
  if (order.status === "EXPIRED")
    return {
      state: "expired",
      terminal: true,
      title: "Reservation expired",
      message:
        "The server reports an expired reservation. Review the order before booking again.",
    };
  if (order.status === "CANCELLED")
    return {
      state: "cancelled",
      terminal: true,
      title: "Reservation cancelled",
      message:
        "The server reports cancellation. Any later verified payment remains tracked on this order.",
    };
  if (latest?.status === "FAILED" || latest?.status === "CANCELLED")
    return {
      state: latest.status.toLowerCase(),
      terminal: true,
      title:
        latest.status === "FAILED"
          ? "Payment attempt failed"
          : "Payment attempt cancelled",
      message:
        "The backend confirmed this attempt's status. Open the order to review whether another checkout is allowed.",
    };
  return {
    state: "verifying",
    terminal: false,
    title: "Checking your booking",
    message:
      "The return address alone does not confirm payment. Waiting for verified order and ticket state.",
  };
}
export function paymentPollDelay(elapsed: number) {
  return elapsed >= 180000 ? null : elapsed < 60000 ? 3000 : 10000;
}
