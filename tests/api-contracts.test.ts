import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  ApiError,
  responseError,
  safeRetryAfter,
  paginationSchema,
} from "../src/lib/api-error";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { privateKey, invalidatePrivate } from "../src/lib/query-keys";
import {
  orderSchema,
  ticketStatusSchema,
  qrSchema,
  checkoutUrlSchema,
  checkoutSchema,
} from "../src/lib/api-schemas";
import { isPrivateRouteAllowed } from "../src/lib/server/private-routes";
import { apiClient, apiList, jsonBody } from "../src/lib/api-client";
import { resetCsrf } from "../src/lib/session-fetch";
import { eventImageSources } from "../src/lib/event-image";
import { getSavedEvents } from "../src/lib/saved-events-api";

const id = "123e4567-e89b-42d3-a456-426614174000";
test("responsive covers preserve CDN tracking and leave arbitrary or signed URLs unchanged", () => {
  const sources = eventImageSources(
    "https://images.unsplash.com/photo-fixture?w=1200&ixid=tracking&dpr=2&fit=crop",
  );
  assert.ok(sources.srcSet);
  const candidates = sources.srcSet.split(", ");
  assert.equal(candidates.length, 6);
  for (const candidate of candidates) {
    const [src, descriptor] = candidate.split(" ");
    const url = new URL(src);
    assert.equal(url.searchParams.get("ixid"), "tracking");
    assert.equal(url.searchParams.get("fit"), "crop");
    assert.equal(url.searchParams.has("dpr"), false);
    assert.equal(descriptor, url.searchParams.get("w") + "w");
  }
  for (const src of [
    "https://organizer.test/cover.jpg?signature=abc",
    "https://images.unsplash.com/photo-fixture?s=signed",
    "https://images.unsplash.com/photo-fixture?h=500",
    "https://images.unsplash.com.evil.test/cover.jpg",
    "invalid",
  ])
    assert.deepEqual(eventImageSources(src), {});
});

test("abandoned filtered requests abort the transport while retaining a bounded deadline", async () => {
  const previous = globalThis.fetch;
  const controller = new AbortController();
  let observed: AbortSignal | undefined;
  globalThis.fetch = async (_input, init) => {
    observed = init?.signal ?? undefined;
    return new Promise((_resolve, reject) => {
      observed!.addEventListener("abort", () => reject(observed!.reason), {
        once: true,
      });
    });
  };
  try {
    const pending = getSavedEvents(
      new URLSearchParams({ page: "2" }),
      controller.signal,
    );
    assert.ok(observed);
    assert.notEqual(observed, controller.signal);
    controller.abort();
    await assert.rejects(
      pending,
      (error: unknown) =>
        error instanceof ApiError && error.code === "API_TIMEOUT",
    );
    assert.equal(observed.aborted, true);
  } finally {
    globalThis.fetch = previous;
  }
});

test("saving one card keeps other card memberships fresh and isolates attendees", async () => {
  const client = new QueryClient();
  const one = privateKey("saved-membership", "attendee", "one");
  const two = privateKey("saved-membership", "attendee", "two");
  const other = privateKey("saved-membership", "another-attendee", "one");
  for (const key of [one, two, other])
    client.setQueryData(key, { saved: null });
  await invalidatePrivate(client, "attendee", ["saved-membership"], "one");
  assert.equal(client.getQueryState(one)?.isInvalidated, true);
  assert.equal(client.getQueryState(two)?.isInvalidated, false);
  assert.equal(client.getQueryState(other)?.isInvalidated, false);
  client.clear();
});
test("checkout accepts a processing outcome without a navigation URL and binds its lookup identity", () => {
  const processing = {
    status: "PROCESSING",
    paymentAttemptId: id,
    merchantTransactionId: "fixture",
    paymentStatus: "UNKNOWN",
    statusPath: `/api/v1/payments/attempts/${id}`,
  };
  assert.equal(checkoutSchema.safeParse(processing).success, true);
  assert.equal(
    checkoutSchema.safeParse({ ...processing, statusPath: "https://evil.test" })
      .success,
    false,
  );
  assert.equal(
    checkoutSchema.safeParse({
      ...processing,
      statusPath: `/api/v1/payments/attempts/${crypto.randomUUID()}`,
    }).success,
    false,
  );
  assert.equal(
    checkoutSchema.safeParse({
      status: "AVAILABLE",
      paymentAttemptId: id,
      merchantTransactionId: "fixture",
    }).success,
    false,
  );
});
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
    false,
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
test("partial malformed diagnostics do not erase valid field errors; pagination must agree", () => {
  const error = responseError(new Response(null, { status: 400 }), {
    message: "Validation failed",
    data: null,
    errors: [
      null,
      { field: "params.id", code: "INVALID_VALUE", message: "Bad ID" },
    ],
  });
  assert.deepEqual(error.fieldErrors.id, ["Bad ID"]);
  assert.equal(error.code, "INVALID_VALUE");
  assert.equal(
    paginationSchema.safeParse({ page: 1, limit: 10, total: 0, totalPages: 0 })
      .success,
    true,
  );
  assert.equal(
    paginationSchema.safeParse({ page: 1, limit: 10, total: 21, totalPages: 2 })
      .success,
    false,
  );
});
test("confirmed invalidations cover filtered resource keys without crossing account boundaries", async () => {
  const client = new QueryClient();
  const affected = privateKey("orders", id, "list", {
    status: "PAID",
    page: 2,
  });
  const otherUser = privateKey("orders", "another-user");
  const unrelated = privateKey("events", id);
  for (const key of [affected, otherUser, unrelated])
    client.setQueryData(key, []);
  await invalidatePrivate(client, id, ["orders"]);
  assert.equal(client.getQueryState(affected)?.isInvalidated, true);
  assert.equal(client.getQueryState(otherUser)?.isInvalidated, false);
  assert.equal(client.getQueryState(unrelated)?.isInvalidated, false);
  client.clear();
  assert.equal(client.getQueryCache().getAll().length, 0);
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

test("availability keeps hosting-access cookies and identifies deployment-protection responses", async () => {
  const { getFreshAvailability } =
    await import("../src/lib/public-availability");
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (path, init) => {
      assert.equal(path, "/api/events/protected-event/availability");
      if (init?.credentials !== "same-origin")
        return new Response("Hosting sign-in required", {
          status: 401,
          headers: { "Content-Type": "text/html" },
        });
      return Response.json({
        success: true,
        data: {
          eventId: id,
          status: "PUBLISHED",
          serverTime: new Date().toISOString(),
          ticketTiers: [],
        },
      });
    };
    assert.equal((await getFreshAvailability("protected-event")).eventId, id);
    globalThis.fetch = async () =>
      new Response("Hosting sign-in required", {
        status: 401,
        headers: { "Content-Type": "text/html" },
      });
    await assert.rejects(
      getFreshAvailability("protected-event"),
      (error: unknown) =>
        error instanceof ApiError &&
        error.code === "DEPLOYMENT_ACCESS_REQUIRED",
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("confirmed mutations release immediately while active reads refresh, scoped to the edited event", async () => {
  const client = new QueryClient();
  const edited = privateKey("organizer-events", id, "edited");
  const other = privateKey("organizer-events", id, "other");
  const list = privateKey("organizer-events", id, "list", { page: 2 });
  for (const key of [edited, other, list])
    client.setQueryData(key, { title: "before" });
  let release!: (value: { title: string }) => void;
  const observer = new QueryObserver(client, {
    queryKey: edited,
    staleTime: Infinity,
    queryFn: () =>
      new Promise<{ title: string }>((resolve) => {
        release = resolve;
      }),
  });
  const unsubscribe = observer.subscribe(() => undefined);
  try {
    const completed = await Promise.race([
      invalidatePrivate(client, id, ["organizer-events"], "edited").then(
        () => true,
      ),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 50)),
    ]);
    assert.equal(completed, true);
    assert.equal(client.getQueryState(edited)?.fetchStatus, "fetching");
    assert.equal(client.getQueryState(other)?.isInvalidated, false);
    assert.equal(client.getQueryState(list)?.isInvalidated, true);
  } finally {
    release({ title: "confirmed" });
    unsubscribe();
    client.clear();
  }
});
