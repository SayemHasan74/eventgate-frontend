import { test } from "node:test";
import assert from "node:assert/strict";
import { upstream } from "../src/lib/server/upstream";
import { SessionError } from "../src/lib/server/session-store";
test("server transport preserves queries/bodies, uses bounded timeouts, and rejects unsafe paths", async () => {
  const fetcher = globalThis.fetch,
    timeout = AbortSignal.timeout,
    base = process.env.API_BASE_URL;
  const timeouts: number[] = [];
  process.env.API_BASE_URL = "https://backend.test/api/v1";
  AbortSignal.timeout = (ms: number) => {
    timeouts.push(ms);
    return new AbortController().signal;
  };
  let seen: { url: string; init: RequestInit } | undefined;
  globalThis.fetch = async (url, init = {}) => {
    seen = { url: String(url), init };
    return Response.json({ success: true, data: null });
  };
  try {
    await upstream("orders?status=PAID&page=2&limit=5", {
      method: "GET",
      headers: { "x-request-id": "request-123" },
    });
    assert.equal(
      seen?.url,
      "https://backend.test/api/v1/orders?status=PAID&page=2&limit=5",
    );
    assert.equal(seen?.init.cache, "no-store");
    assert.equal(seen?.init.redirect, "error");
    await upstream("payments/orders/123/checkout", {
      method: "POST",
      headers: { "Idempotency-Key": "test-key" },
      body: "{}",
    });
    assert.equal(seen?.init.body, "{}");
    await upstream("auth/demo", {
      method: "POST",
      body: '{"role":"ATTENDEE"}',
    });
    assert.deepEqual(timeouts, [15000, 25000, 75000]);
    await assert.rejects(
      upstream("https://evil.test"),
      (error: unknown) => error instanceof SessionError && error.status === 404,
    );
    await assert.rejects(
      upstream("orders/../users"),
      (error: unknown) => error instanceof SessionError && error.status === 404,
    );
    globalThis.fetch = async () => {
      throw new DOMException("timeout", "TimeoutError");
    };
    await assert.rejects(
      upstream("orders"),
      (error: unknown) =>
        error instanceof SessionError && error.code === "API_TIMEOUT",
    );
    globalThis.fetch = async () => {
      throw new Error("network secret https://provider.test?passwd=SECRET");
    };
    await assert.rejects(
      upstream("orders"),
      (error: unknown) =>
        error instanceof SessionError &&
        error.code === "API_UNAVAILABLE" &&
        !error.message.includes("SECRET"),
    );
  } finally {
    globalThis.fetch = fetcher;
    AbortSignal.timeout = timeout;
    if (base === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = base;
  }
});
