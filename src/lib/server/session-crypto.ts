import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export function encryptionKey() {
  const encoded = process.env.SESSION_ENCRYPTION_KEY;
  if (!encoded || !/^[a-f\d]{64}$/i.test(encoded))
    throw new Error(
      "SESSION_ENCRYPTION_KEY must be 64 hexadecimal characters.",
    );
  return Buffer.from(encoded, "hex");
}
export const nonce = () => randomBytes(32).toString("base64url");
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const csrfForGuest = (value: string) =>
  createHmac("sha256", encryptionKey())
    .update(`csrf:${value}`)
    .digest("base64url");
export function equalSecret(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function encryptTokens(
  tokens: { accessToken: string; refreshToken: string },
  sessionKey: string,
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(sessionKey));
  const data = Buffer.concat([
    cipher.update(JSON.stringify(tokens)),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}
export function decryptTokens(
  value: string,
  sessionKey: string,
): { accessToken: string; refreshToken: string } {
  const data = Buffer.from(value, "base64");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    data.subarray(0, 12),
  );
  cipher.setAuthTag(data.subarray(12, 28));
  cipher.setAAD(Buffer.from(sessionKey));
  const decoded = JSON.parse(
    Buffer.concat([
      cipher.update(data.subarray(28)),
      cipher.final(),
    ]).toString(),
  );
  if (
    typeof decoded.accessToken !== "string" ||
    typeof decoded.refreshToken !== "string"
  )
    throw new Error("Invalid stored credentials.");
  return decoded;
}
