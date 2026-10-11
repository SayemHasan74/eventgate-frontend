import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { ApiError, responseError, safeRetryAfter } from "../src/lib/api-error";
import {
  orderSchema,
  ticketStatusSchema,
  qrSchema,
  checkoutUrlSchema,
} from "../src/lib/api-schemas";
import { isPrivateRouteAllowed } from "../src/lib/server/private-routes";
import { apiClient, apiList, jsonBody } from "../src/lib/api-client";
import { resetCsrf } from "../src/lib/session-fetch";

const id = "123e4567-e89b-42d3-a456-426614174000";
test("all validation errors, field names, request ID and safe retry information survive", () => {
  const error = responseError(
    new Response(null, {
      status: 400,
      headers: { "x-request-id": "request-123", "retry-after": "30" },
    }),
    {
      message: "Validation failed",
      errors: [
        {
          field: "body.email",
          code: "INVALID_EMAIL",
          message: "Invalid email",
        },
        { field: "body.email", code: "TOO_LONG", message: "Too long" },
        { field: "query.page", code: "INVALID_PAGE", message: "Invalid page" },
      ],
    },
  );
  assert.equal(error.status, 400);
  assert.equal(error.code, "INVALID_EMAIL");
  assert.deepEqual(error.fieldErrors.email, ["Invalid email", "Too long"]);
  assert.equal(error.fieldErrors.page[0], "Invalid page");
  assert.equal(error.requestId, "request-123");
  assert.equal(error.retryAfter, "30");
  assert.equal(safeRetryAfter("bad\r\nheader"), undefined);
});
test("payment addresses and diagnostics never disclose credential URLs", () => {
  for (const url of [
    "http://sandbox.sslcommerz.com",
    "https://evil.test/pay",
    "https://secret@sandbox.sslcommerz.com",
    "https://sandbox.sslcommerz.com/pay?store_passwd=secret",
  ])
    assert.equal(checkoutUrlSchema.safeParse(url).success, false);
  assert.equal(
    checkoutUrlSchema.safeParse(
      "https://sandbox.sslcommerz.com/EasyCheckOut/test?sessionkey=session",
    ).success,
    true,
  );
  const error = responseError(new Response(null, { status: 503 }), {
    message: "Cannot call https://provider.test?store_passwd=hidden",
  });
  assert.equal(error.message.includes("hidden"), false);
});
test("critical state, integer money and PNG boundaries reject corrupt data", () => {
  const order = {
    id,
    eventId: id,
    ticketTierId: id,
    eventNameSnapshot: "Event",
    ticketTierNameSnapshot: "Tier",
    unitPricePaisaSnapshot: 100,
    quantity: 2,
    totalAmountPaisaSnapshot: 200,
    currency: "BDT",
    status: "EXPIRED",
    reservationExpiresAt: null,
    reservationReleasedAt: null,
    createdAt: "2026-10-11T00:00:00Z",
    updatedAt: "2026-10-11T00:00:00Z",
  };
  assert.equal(orderSchema.safeParse(order).success, true);
  assert.equal(
    orderSchema.safeParse({ ...order, totalAmountPaisaSnapshot: 201 }).success,
    false,
  );
  assert.equal(
    orderSchema.safeParse({ ...order, unitPricePaisaSnapshot: 0.1 }).success,
    false,
  );
  assert.equal(ticketStatusSchema.safeParse("VOIDED").success, true);
  assert.equal(ticketStatusSchema.safeParse("VOID").success, false);
  assert.equal(
    qrSchema.safeParse({
      ticketId: id,
      mimeType: "image/png",
      dataUrl: "data:image/png;base64,iVBORw==",
    }).success,
    true,
  );
  assert.equal(
    qrSchema.safeParse({
      ticketId: id,
      mimeType: "image/svg+xml",
      dataUrl: "<svg/>",
    }).success,
    false,
  );
});
test("route/method allowlist supports edits and attempt reads but excludes open proxy/callbacks", () => {
  for (const [method, path] of [
    ["PATCH", `organizer/events/${id}`],
    ["DELETE", `organizer/events/${id}/ticket-tiers/${id}`],
    ["GET", `payments/attempts/${id}`],
    ["POST", `orders/${id}/refund-requests`],
    ["GET", "admin/refunds"],
  ])
    assert.equal(isPrivateRouteAllowed(method, path), true);
  for (const [method, path] of [
    ["GET", "auth/login"],
    ["POST", "payments/sslcommerz/success"],
    ["DELETE", "admin/users"],
    ["GET", "admin/refunds/../../users"],
    ["POST", `tickets/${id}/qr`],
    ["GET", "https://evil.test"],
  ])
    assert.equal(isPrivateRouteAllowed(method, path), false);
});
test("shared browser transport forwards filters, CSRF, JSON and idempotency without Bearer", async () => {
  const previous = globalThis.fetch;
  resetCsrf();
  const requests: Array<{ path: string; init: RequestInit }> = [];
  globalThis.fetch = async (path, init = {}) => {
    requests.push({ path: String(path), init });
    if (path === "/api/auth/csrf")
      return Response.json({ success: true, data: { csrf: "test-nonce" } });
    return Response.json({ success: true, data: { id } });
  };
  try {
    await apiClient(
      "/api/orders?status=PAID&page=2",
      z.object({ id: z.uuid() }),
      {
        method: "POST",
        ...jsonBody({ quantity: 2 }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer MUST-NOT-LEAK",
          "Idempotency-Key": "key-123",
        },
      },
    );
    const call = requests[1];
    const headers = new Headers(call.init.headers);
    assert.equal(call.path, "/api/orders?status=PAID&page=2");
    assert.equal(headers.get("authorization"), null);
    assert.equal(headers.get("x-eventgate-csrf"), "test-nonce");
    assert.equal(headers.get("idempotency-key"), "key-123");
    assert.ok(headers.get("x-request-id"));
    assert.deepEqual(JSON.parse(String(call.init.body)), { quantity: 2 });
    assert.equal(call.init.credentials, "same-origin");
    assert.equal(call.init.cache, "no-store");
    globalThis.fetch = async () => Response.json({ success: true, data: [] });
    await assert.rejects(
      apiList("/api/orders", orderSchema),
      (error: unknown) =>
        error instanceof ApiError && error.code === "INVALID_API_RESPONSE",
    );
    globalThis.fetch = async () =>
      Response.json({
        success: true,
        data: [],
        meta: { page: 2, limit: 10, total: 23, totalPages: 3 },
      });
    assert.equal(
      (await apiList("/api/orders?page=2", orderSchema)).meta.total,
      23,
    );
    globalThis.fetch = async () => {
      throw new DOMException("Timed out", "TimeoutError");
    };
    await assert.rejects(
      apiClient("/api/orders", z.unknown()),
      (error: unknown) =>
        error instanceof ApiError && error.code === "API_TIMEOUT",
    );
  } finally {
    globalThis.fetch = previous;
    resetCsrf();
  }
});
