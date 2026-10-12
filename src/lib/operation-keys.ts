"use client";
import { ApiError } from "./api-error";
const prefix = "eventgate.operation.";
const memory = new Map<string, string>();
const name = (kind: string, userId: string, resource: string) =>
  `${prefix}${kind}.${userId}.${resource}`;
export function existingOperationKey(
  kind: string,
  userId: string,
  resource: string,
) {
  const id = name(kind, userId, resource);
  try {
    const value = window.sessionStorage.getItem(id);
    if (
      value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      memory.set(id, value);
      return value;
    }
  } catch {
    /* Retain in-memory keys when storage is blocked. */
  }
  return memory.get(id) ?? null;
}
export function operationKey(kind: string, userId: string, resource: string) {
  const id = name(kind, userId, resource);
  const key =
    existingOperationKey(kind, userId, resource) ?? crypto.randomUUID();
  memory.set(id, key);
  try {
    window.sessionStorage.setItem(id, key);
  } catch {
    /* The backend still binds the key durably. */
  }
  return key;
}
export function clearOperationKey(
  kind: string,
  userId: string,
  resource: string,
) {
  const id = name(kind, userId, resource);
  memory.delete(id);
  try {
    window.sessionStorage.removeItem(id);
  } catch {
    /* Storage may be disabled. */
  }
}
export function clearOperationKeys() {
  memory.clear();
  try {
    window.sessionStorage.removeItem("eventgate.checkout-context");
    for (const id of Object.keys(window.sessionStorage))
      if (id.startsWith(prefix)) window.sessionStorage.removeItem(id);
  } catch {
    /* Logout must not depend on storage. */
  }
}
export function definitiveFailure(error: unknown) {
  return (
    error instanceof ApiError &&
    [400, 403, 404, 409, 422].includes(error.status) &&
    ![
      "IDEMPOTENCY_REQUEST_IN_PROGRESS",
      "PAYMENT_REQUIRES_INVESTIGATION",
      "INVALID_API_RESPONSE",
    ].includes(error.code)
  );
}
