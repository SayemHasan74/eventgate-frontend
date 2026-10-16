import "server-only";
import { createClient } from "redis";
import { z } from "zod";
import { authUserSchema } from "@/lib/auth-types";
import { digest, encryptionKey, nonce } from "./session-crypto";

export class SessionError extends Error {
  constructor(
    public code: string,
    public status = 503,
  ) {
    super(
      status === 401
        ? "Please sign in again."
        : status === 403
          ? "This request is not permitted."
          : "The session service is unavailable. Please try again.",
    );
  }
}
const recordSchema = z.object({
  user: authUserSchema,
  tokens: z.string(),
  accessExpiresAt: z.number(),
  absoluteExpiresAt: z.number(),
  version: z.number().int(),
  csrf: z.string(),
});
export type SessionRecord = z.infer<typeof recordSchema>;
export type StoredSession = { id: string; key: string; record: SessionRecord };
const makeClient = (url: string) =>
  createClient({
    url,
    disableOfflineQueue: true,
    socket: { connectTimeout: 5000, reconnectStrategy: false },
  });
type Client = ReturnType<typeof makeClient>;
let connection: Promise<Client> | undefined;
export async function redis() {
  encryptionKey();
  const url = process.env.SESSION_REDIS_URL;
  if (!url) throw new SessionError("SESSION_CONFIGURATION_ERROR");
  // A serverless instance can resume after its idle socket has closed.
  // Recover the connection before issuing any command; never replay a write.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!connection) {
      const client = makeClient(url);
      client.on("error", () => {
        /* Never log connection URLs or secrets. */
      });
      const pending: Promise<Client> = client
        .connect()
        .then(() => client)
        .catch(() => {
          if (connection === pending) connection = undefined;
          throw new SessionError("SESSION_UNAVAILABLE");
        });
      connection = pending;
    }
    const connecting = connection;
    const client = await connecting;
    if (client.isReady) return client;
    if (connection === connecting) connection = undefined;
    if (client.isOpen) client.destroy();
  }
  throw new SessionError("SESSION_UNAVAILABLE");
}
export async function command<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new SessionError("SESSION_UNAVAILABLE")),
          5000,
        );
      }),
    ]);
  } catch {
    throw new SessionError("SESSION_UNAVAILABLE");
  } finally {
    clearTimeout(timer);
  }
}
export const sessionKey = (id: string) => `eventgate:bff:session:${digest(id)}`;
export async function loadSession(
  id: string | undefined,
): Promise<StoredSession | null> {
  if (!id || !/^[\w-]{43}$/.test(id)) return null;
  const key = sessionKey(id);
  const raw = await command((await redis()).get(key));
  if (!raw) return null;
  let record: SessionRecord;
  try {
    record = recordSchema.parse(JSON.parse(raw));
  } catch {
    await destroySession(id);
    throw new SessionError("SESSION_INVALID", 401);
  }
  if (record.absoluteExpiresAt <= Date.now()) {
    await destroySession(id);
    return null;
  }
  return { id, key, record };
}
export async function destroySession(id: string) {
  await command((await redis()).del(sessionKey(id)));
}
export async function createStoredSession(record: SessionRecord, id: string) {
  const result = await command(
    (await redis()).set(sessionKey(id), JSON.stringify(record), {
      NX: true,
      PX: Math.max(1, record.absoluteExpiresAt - Date.now()),
    }),
  );
  if (result !== "OK") throw new SessionError("SESSION_UNAVAILABLE");
}
const releaseScript =
  "if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0";
const renewScript =
  "if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE',KEYS[1],ARGV[2]) end return 0";
const saveScript = `
if redis.call('GET',KEYS[2]) ~= ARGV[1] then return 0 end
local raw = redis.call('GET',KEYS[1])
if not raw or cjson.decode(raw).version ~= tonumber(ARGV[2]) then return 0 end
redis.call('SET',KEYS[1],ARGV[3],'PX',ARGV[4])
return 1`;
export async function withSessionLock<T>(
  id: string,
  run: (
    session: StoredSession,
    save: (record: SessionRecord) => Promise<void>,
  ) => Promise<T>,
): Promise<T> {
  const client = await redis();
  const key = sessionKey(id);
  const lockKey = `${key}:lock`;
  const owner = nonce();
  const deadline = Date.now() + 25000;
  while (
    (await command(client.set(lockKey, owner, { NX: true, PX: 30000 }))) !==
    "OK"
  ) {
    if (Date.now() >= deadline) throw new SessionError("SESSION_BUSY");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  let lost = false;
  let renewal: Promise<void> = Promise.resolve();
  const timer = setInterval(() => {
    renewal = renewal
      .then(async () => {
        const renewed = await command(
          client.eval(renewScript, {
            keys: [lockKey],
            arguments: [owner, "30000"],
          }),
        );
        if (renewed !== 1) lost = true;
      })
      .catch(() => {
        lost = true;
      });
  }, 6000);
  try {
    const session = await loadSession(id);
    if (!session) throw new SessionError("SESSION_EXPIRED", 401);
    const save = async (record: SessionRecord) => {
      if (lost || record.absoluteExpiresAt <= Date.now())
        throw new SessionError("SESSION_EXPIRED", 401);
      const result = await command(
        client.eval(saveScript, {
          keys: [key, lockKey],
          arguments: [
            owner,
            String(session.record.version),
            JSON.stringify(record),
            String(Math.max(1, record.absoluteExpiresAt - Date.now())),
          ],
        }),
      );
      if (result !== 1) throw new SessionError("SESSION_CHANGED", 401);
    };
    return await run(session, save);
  } finally {
    clearInterval(timer);
    await renewal;
    await command(
      client.eval(releaseScript, { keys: [lockKey], arguments: [owner] }),
    ).catch(() => undefined);
  }
}
