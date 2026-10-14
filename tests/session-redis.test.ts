import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  createStoredSession, destroySession, loadSession, redis, sessionKey,
  SessionError, withSessionLock, type StoredSession,
} from "../src/lib/server/session-store";
import { decryptTokens, encryptTokens, nonce } from "../src/lib/server/session-crypto";
import { authenticatedFetch, logoutSession, refreshSession } from "../src/lib/server/browser-session";

test("browser session lifecycle against real, disposable Redis records", async (t) => {
  assert.ok(process.env.SESSION_TEST_REDIS_URL, "Set SESSION_TEST_REDIS_URL to an isolated Redis instance");
  process.env.SESSION_REDIS_URL = process.env.SESSION_TEST_REDIS_URL;
  process.env.SESSION_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  process.env.API_BASE_URL = "https://session-fixture.invalid/api/v1";
  const originalFetch = globalThis.fetch;
  const records: string[] = [];
  const user = { id: randomUUID(), email: "session-test@example.com", displayName: "Session test", role: "ATTENDEE" as const, isDemo: false };
  const payload = (n: number) => ({ success: true, data: { user, accessToken: `access-${n}`, refreshToken: `refresh-${n}`, accessTokenExpiresIn: 900 } });
  const fresh = async (): Promise<StoredSession> => {
    const id = nonce(), key = sessionKey(id);
    records.push(id);
    const record = { user, tokens: encryptTokens({ accessToken: "access-0", refreshToken: "refresh-0" }, key), accessExpiresAt: Date.now() - 1, absoluteExpiresAt: Date.now() + 60000, version: 1, csrf: nonce() };
    await createStoredSession(record, id);
    return { id, key, record };
  };
  try {
    await t.test("eight concurrent refreshes rotate once and preserve absolute expiry", async () => {
      const session = await fresh();
      let calls = 0;
      globalThis.fetch = async (_url, init) => {
        assert.equal(JSON.parse(String(init?.body)).refreshToken, "refresh-0");
        calls++;
        await new Promise(resolve => setTimeout(resolve, 40));
        return Response.json(payload(1));
      };
      const results = await Promise.all(Array.from({ length: 8 }, () => refreshSession(session)));
      assert.equal(calls, 1);
      for (const result of results) {
        assert.equal(result.record.version, 2);
        assert.equal(result.record.absoluteExpiresAt, session.record.absoluteExpiresAt);
        assert.equal(decryptTokens(result.record.tokens, result.key).refreshToken, "refresh-1");
      }
    });
    await t.test("a separate process holds the distributed lock; waiter reloads its version", async () => {
      const session = await fresh();
      const source = `const {withSessionLock,redis}=require('./src/lib/server/session-store.ts'); (async()=>{await withSessionLock(${JSON.stringify(session.id)},async(s,save)=>{console.log('LOCKED');await new Promise(r=>setTimeout(r,300));await save({...s.record,version:2});});(await redis()).destroy();})().catch(()=>process.exit(1));`;
      const child = spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "-e", source], { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] });
      const exited = once(child, "exit");
      try {
        const [data] = await once(child.stdout, "data");
        assert.match(String(data), /LOCKED/);
        const version = await withSessionLock(session.id, async s => s.record.version);
        assert.equal(version, 2);
        assert.equal((await exited)[0], 0);
      } finally {
        if (child.exitCode === null) child.kill();
      }
    });
    await t.test("renewal keeps owner lock alive and release does not delete another owner", async () => {
      const session = await fresh(), client = await redis();
      await withSessionLock(session.id, async () => {
        await new Promise(resolve => setTimeout(resolve, 6500));
        assert.ok(await client.pTTL(`${session.key}:lock`) > 27000);
        await client.set(`${session.key}:lock`, "replacement-owner", { PX: 1000 });
      });
      assert.equal(await client.get(`${session.key}:lock`), "replacement-owner");
      await client.del(`${session.key}:lock`);
    });
    await t.test("logout during rotation cannot resurrect the session", async () => {
      const session = await fresh();
      let begin!: () => void, finish!: () => void;
      const started = new Promise<void>(resolve => { begin = resolve; });
      const gate = new Promise<void>(resolve => { finish = resolve; });
      globalThis.fetch = async url => {
        if (String(url).endsWith("auth/refresh")) { begin(); await gate; return Response.json(payload(1)); }
        return Response.json({ success: true, data: null });
      };
      const rotation = refreshSession(session);
      const rejected = assert.rejects(rotation, (error: unknown) => error instanceof SessionError && error.status === 401);
      await started;
      await logoutSession(session);
      finish();
      await rejected;
      assert.equal(await loadSession(session.id), null);
    });
    await t.test("failure to persist rotated tokens fails closed", async () => {
      const session = await fresh();
      globalThis.fetch = async () => { await destroySession(session.id); return Response.json(payload(1)); };
      await assert.rejects(refreshSession(session), (error: unknown) => error instanceof SessionError && error.status === 401);
      assert.equal(await loadSession(session.id), null);
    });
    await t.test("forbidden preserves the session; inactive account invalidates it", async () => {
      const session = await fresh();
      session.record.accessExpiresAt = Date.now() + 900000;
      globalThis.fetch = async () => Response.json({ success: false, errors: [{ code: "FORBIDDEN" }] }, { status: 403 });
      assert.equal((await authenticatedFetch(session, "users/me")).status, 403);
      assert.ok(await loadSession(session.id));
      globalThis.fetch = async () => Response.json({ success: false, errors: [{ code: "ACCOUNT_INACTIVE" }] }, { status: 401 });
      await assert.rejects(authenticatedFetch(session, "users/me"), (error: unknown) => error instanceof SessionError && error.code === "ACCOUNT_INACTIVE");
      assert.equal(await loadSession(session.id), null);
    });
    await t.test("logout reports backend rejection/network outage after deleting local session", async () => {
      for (const response of ["http", "network"]) {
        const session = await fresh();
        globalThis.fetch = async () => { if (response === "network") throw new Error("fixture offline"); return new Response(null, { status: 503 }); };
        await assert.rejects(logoutSession(session), (error: unknown) => error instanceof SessionError && error.code === "LOGOUT_REVOCATION_UNAVAILABLE");
        assert.equal(await loadSession(session.id), null);
      }
    });
    await t.test("fabricated and expired identifiers grant no session", async () => {
      assert.equal(await loadSession("1"), null);
      assert.equal(await loadSession(nonce()), null);
      const session = await fresh();
      await (await redis()).set(session.key, JSON.stringify({ ...session.record, absoluteExpiresAt: Date.now() - 1 }));
      assert.equal(await loadSession(session.id), null);
    });
  } finally {
    globalThis.fetch = originalFetch;
    const client = await redis();
    for (const id of records) await client.del([sessionKey(id), `${sessionKey(id)}:lock`]);
    client.destroy();
  }
});
