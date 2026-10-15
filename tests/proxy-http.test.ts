import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  createStoredSession,
  destroySession,
  redis,
  sessionKey,
} from "../src/lib/server/session-store";
import { encryptTokens, nonce } from "../src/lib/server/session-crypto";

// Uses the existing API's Express installation, but only disposable HTTP fixtures and Redis records.
test("production Next proxies preserve the transport contract all the way to Express", async () => {
  assert.ok(
    process.env.EVENTGATE_API_TEST_ROOT,
    "Set EVENTGATE_API_TEST_ROOT to the backend checkout",
  );
  assert.ok(
    process.env.SESSION_TEST_REDIS_URL,
    "Use isolated SESSION_TEST_REDIS_URL",
  );
  const requireApi = createRequire(
    resolve(process.env.EVENTGATE_API_TEST_ROOT, "package.json"),
  );
  const express = requireApi("express");
  process.env.SESSION_REDIS_URL = process.env.SESSION_TEST_REDIS_URL;
  process.env.SESSION_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  const id = randomUUID(),
    sid = nonce(),
    csrf = nonce(),
    key = sessionKey(sid);
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0d8AAAAASUVORK5CYII=";
  let seen:
    | {
        path: string;
        method: string;
        headers: IncomingMessage["headers"];
        body: string;
      }
    | undefined;
  const app = express();
  app.use(express.raw({ type: "*/*" }));
  app.use(
    (
      request: IncomingMessage & { originalUrl: string; body?: Buffer },
      response: ServerResponse,
    ) => {
      seen = {
        path: request.originalUrl,
        method: request.method!,
        headers: request.headers,
        body: request.body?.toString() ?? "",
      };
      const url = new URL(request.originalUrl, "http://fixture.invalid");
      response.setHeader("Content-Type", "application/json");
      response.setHeader(
        "x-request-id",
        request.headers["x-request-id"] ?? "fixture-request",
      );
      if (url.searchParams.has("rate")) {
        response.statusCode = 429;
        response.setHeader("Retry-After", "30");
        response.end(
          JSON.stringify({
            success: false,
            message: "Too many requests",
            data: null,
            errors: [
              null,
              { field: "query.limit", code: "RATE_LIMITED", message: "Wait" },
            ],
          }),
        );
        return;
      }
      if (url.searchParams.has("offline")) {
        response.statusCode = 503;
        response.end("not JSON");
        return;
      }
      let data: unknown = [];
      if (url.pathname.endsWith("/qr"))
        data = {
          ticketId: url.searchParams.has("wrong") ? randomUUID() : id,
          mimeType: "image/png",
          dataUrl: url.searchParams.has("invalid")
            ? "data:image/png;base64,iVBORw=="
            : png,
          qrToken: "MUST_NOT_BE_RELAYED",
        };
      if (
        url.pathname.endsWith("/checkout") &&
        url.searchParams.has("processing")
      )
        response.statusCode = 202;
      if (url.pathname.endsWith("/checkout"))
        data = url.searchParams.has("processing")
          ? {
              status: "PROCESSING",
              paymentAttemptId: id,
              merchantTransactionId: "fixture-transaction",
              paymentStatus: "UNKNOWN",
              statusPath: `/api/v1/payments/attempts/${id}`,
            }
          : {
              paymentAttemptId: id,
              merchantTransactionId: "fixture-transaction",
              checkoutUrl: url.searchParams.has("unsafe")
                ? "https://sandbox.sslcommerz.com/pay?store_passwd=MUST_NOT_LEAK"
                : "https://sandbox.sslcommerz.com/pay?sessionkey=fixture",
            };
      response.end(
        JSON.stringify({
          success: true,
          message: "Fixture",
          data,
          meta: { page: 2, limit: 5, total: 8, totalPages: 2 },
        }),
      );
    },
  );
  const backend = createServer(app);
  backend.listen(0, "127.0.0.1");
  await once(backend, "listening");
  const backendAddress = backend.address();
  assert.ok(backendAddress && typeof backendAddress !== "string");
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const address = reservation.address();
  assert.ok(address && typeof address !== "string");
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  // NextURL deliberately canonicalizes loopback hostnames to localhost.
  const origin = `http://localhost:${address.port}`;
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(address.port),
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        API_BASE_URL: `http://127.0.0.1:${backendAddress.port}/api/v1`,
      },
      stdio: "ignore",
    },
  );
  const exited = once(child, "exit");
  try {
    await createStoredSession(
      {
        user: {
          id,
          email: "fixture@example.com",
          displayName: "Fixture",
          role: "ATTENDEE",
        },
        tokens: encryptTokens(
          {
            accessToken: "server-held-access",
            refreshToken: "server-held-refresh",
          },
          key,
        ),
        accessExpiresAt: Date.now() + 900000,
        absoluteExpiresAt: Date.now() + 60000,
        version: 1,
        csrf,
      },
      sid,
    );
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        if ((await fetch(origin + "/api/auth/session")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, "production Next server must start");
    const call = (path: string, method = "GET", body?: string) =>
      fetch(origin + path, {
        method,
        headers: {
          Cookie: `__Host-eventgate.sid=${sid}`,
          Origin: origin,
          "x-eventgate-csrf": csrf,
          "x-request-id": "transport-test-123",
          "Idempotency-Key": "fixture-key",
          "Content-Type": "application/json",
        },
        ...(body ? { body } : {}),
      });
    for (const [path, upstream, method] of [
      ["orders", "orders", "GET"],
      ["tickets", "tickets", "GET"],
      ["users/me", "users/me", "PATCH"],
      ["admin/users", "admin/users", "GET"],
      [`admin/events/${id}/cancel`, `admin/events/${id}/cancel`, "POST"],
      [
        `admin/payments/${id}/reconcile`,
        `admin/payments/${id}/reconcile`,
        "POST",
      ],
      [
        `admin/refunds/${id}/reconcile`,
        `admin/refunds/${id}/reconcile`,
        "POST",
      ],
      [`admin/refunds/${id}/retry`, `admin/refunds/${id}/retry`, "POST"],
      [
        `admin/reports/jobs/${id}/retry`,
        `admin/reports/jobs/${id}/retry`,
        "POST",
      ],
      [`admin/users/${id}`, `admin/users/${id}`, "DELETE"],
      [`organizer/events/${id}`, `organizer/events/${id}`, "PATCH"],
      [
        `organizer/events/${id}/ticket-tiers/${id}`,
        `organizer/events/${id}/ticket-tiers/${id}`,
        "DELETE",
      ],
      [`payments/attempts/${id}`, `payments/attempts/${id}`, "GET"],
      ["refunds/refund-requests", "refund-requests", "GET"],
      [
        `refunds/orders/${id}/refund-requests`,
        `orders/${id}/refund-requests`,
        "POST",
      ],
      [`refunds/admin/refunds/${id}`, `admin/refunds/${id}`, "PATCH"],
    ]) {
      const body =
        method === "POST" || method === "PATCH"
          ? JSON.stringify({ fixture: true })
          : undefined;
      const response = await call(
        `/api/${path}?page=2&limit=5&search=two%20words`,
        method,
        body,
      );
      assert.equal(
        response.status,
        200,
        `${path}: ${response.ok ? "" : await response.clone().text()}`,
      );
      const forwarded = new URL(seen!.path, "http://fixture.invalid");
      assert.equal(forwarded.pathname, `/api/v1/${upstream}`);
      assert.deepEqual(
        [...forwarded.searchParams],
        [
          ["page", "2"],
          ["limit", "5"],
          ["search", "two words"],
        ],
      );
      assert.equal(seen?.method, method);
      assert.equal(seen?.headers.authorization, "Bearer server-held-access");
      assert.equal(seen?.headers["idempotency-key"], "fixture-key");
      assert.equal(seen?.headers["x-request-id"], "transport-test-123");
      assert.equal(seen?.body, body ?? "");
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal((await response.json()).meta.total, 8);
    }
    const qr = await call(`/api/tickets/${id}/qr`);
    assert.equal(qr.status, 200);
    assert.equal((await qr.json()).data.qrToken, undefined);
    for (const flag of ["wrong", "invalid"])
      assert.equal((await call(`/api/tickets/${id}/qr?${flag}=1`)).status, 502);
    const checkout = await call(`/api/payments/orders/${id}/checkout`, "POST");
    assert.equal(checkout.status, 200);
    const processing = await call(
      `/api/payments/orders/${id}/checkout?processing=1`,
      "POST",
    );
    assert.equal(processing.status, 202);
    assert.equal((await processing.json()).data.status, "PROCESSING");
    const unsafe = await call(
      `/api/payments/orders/${id}/checkout?unsafe=1`,
      "POST",
    );
    assert.equal(unsafe.status, 502);
    assert.equal((await unsafe.text()).includes("MUST_NOT_LEAK"), false);
    const rate = await call("/api/orders?rate=1");
    assert.equal(rate.status, 429);
    assert.equal(rate.headers.get("retry-after"), "30");
    assert.equal((await rate.json()).errors[0].field, "limit");
    assert.equal((await call("/api/orders?offline=1")).status, 503);
    for (const path of [
      "/api/refunds/admin/users",
      "/api/payments/sslcommerz/success",
      "/api/organizer/auth/login",
    ]) {
      seen = undefined;
      assert.equal((await call(path, "POST")).status, 404);
      assert.equal(seen, undefined);
    }
  } finally {
    child.kill();
    await exited;
    await destroySession(sid);
    (await redis()).destroy();
    await new Promise<void>((resolve) => backend.close(() => resolve()));
  }
});
