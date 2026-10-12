import { test } from "node:test";
import assert from "node:assert/strict";
import {
  paymentReturnState,
  paymentPollDelay,
} from "../src/lib/payment-return-state";
import { paymentReturnId } from "../src/lib/payment-return-id";
import type { OrderDetail } from "../src/lib/order-api";
const order = (values: Partial<OrderDetail> = {}): OrderDetail => ({
  id: "00000000-0000-4000-8000-000000000001",
  eventId: "00000000-0000-4000-8000-000000000002",
  ticketTierId: "00000000-0000-4000-8000-000000000003",
  eventNameSnapshot: "Event",
  ticketTierNameSnapshot: "Tier",
  unitPricePaisaSnapshot: 100,
  quantity: 1,
  totalAmountPaisaSnapshot: 100,
  currency: "BDT",
  status: "PENDING_PAYMENT",
  reservationExpiresAt: "2026-10-12T10:15:00Z",
  reservationReleasedAt: null,
  createdAt: "2026-10-12T10:00:00Z",
  updatedAt: "2026-10-12T10:00:00Z",
  serverTime: "2026-10-12T10:00:00Z",
  payable: true,
  paidAt: null,
  refundedAt: null,
  refundEligibility: { eligible: false, reasons: [] },
  cancellable: true,
  financialReviewRequired: false,
  fulfilledPaymentAttemptId: null,
  refunds: [],
  ticketIds: [],
  event: {
    slug: "event",
    startAt: "2026-10-14T10:00:00Z",
    status: "PUBLISHED",
  },
  paymentAttempts: [],
  ...values,
});
const attempt = {
  id: "00000000-0000-4000-8000-000000000004",
  orderId: "00000000-0000-4000-8000-000000000001",
  merchantTransactionId: "eg_demo",
  amountPaisa: 100,
  currency: "BDT" as const,
  status: "SUCCEEDED" as const,
  initiatedAt: "2026-10-12T10:00:00Z",
  completedAt: "2026-10-12T10:01:00Z",
};
test("return URLs cannot establish payment success", () => {
  assert.equal(paymentReturnId("fake"), null);
  assert.equal(paymentReturnId([order().id]), null);
  assert.equal(paymentReturnState(order()).state, "verifying");
  assert.equal(
    paymentReturnState(order({ status: "PAID", ticketIds: [order().id] }))
      .state,
    "verifying",
  );
  assert.equal(
    paymentReturnState(
      order({
        status: "PAID",
        fulfilledPaymentAttemptId: attempt.id,
        paymentAttempts: [attempt],
        ticketIds: [order().id],
      }),
    ).state,
    "paid",
  );
});
test("cancellation, uncertainty and late capture are distinct", () => {
  assert.equal(
    paymentReturnState(order({ paymentAttempts: [attempt] })).state,
    "verifying",
  );
  assert.equal(
    paymentReturnState(
      order({
        status: "CANCELLED",
        paymentAttempts: [{ ...attempt, status: "PENDING" }],
      }),
    ).state,
    "verifying",
  );
  assert.equal(
    paymentReturnState(
      order({ paymentAttempts: [{ ...attempt, status: "UNKNOWN" }] }),
    ).terminal,
    false,
  );
  assert.equal(
    paymentReturnState(
      order({ status: "CANCELLED", paymentAttempts: [attempt] }),
    ).state,
    "refund-pending",
  );
  assert.equal(
    paymentReturnState(order({ status: "EXPIRED" })).state,
    "expired",
  );
  assert.equal(
    paymentReturnState(
      order({ paymentAttempts: [{ ...attempt, status: "FAILED" }] }),
    ).state,
    "failed",
  );
});
test("polling cadence is bounded to three minutes", () => {
  assert.equal(paymentPollDelay(0), 3000);
  assert.equal(paymentPollDelay(59999), 3000);
  assert.equal(paymentPollDelay(60000), 10000);
  assert.equal(paymentPollDelay(179999), 10000);
  assert.equal(paymentPollDelay(180000), null);
});
