"use client";
import { z } from "zod";
const key = "eventgate.checkout-context";
const schema = z.object({
  orderId: z.uuid(),
  attemptId: z.uuid(),
  createdAt: z.number().finite(),
});
export function rememberCheckout(orderId: string, attemptId: string) {
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({ orderId, attemptId, createdAt: Date.now() }),
    );
    window.dispatchEvent(new Event("eventgate-checkout-context"));
  } catch {
    /* This hint is never required for authentication or verification. */
  }
}
export function recentCheckout() {
  try {
    const parsed = schema.safeParse(
      JSON.parse(window.sessionStorage.getItem(key) ?? "null"),
    );
    if (
      parsed.success &&
      parsed.data.createdAt <= Date.now() &&
      Date.now() - parsed.data.createdAt < 86400000
    )
      return parsed.data;
  } catch {
    /* Treat unavailable storage as no context. */
  }
  return null;
}
export function clearCheckoutContext(orderId: string) {
  try {
    if (recentCheckout()?.orderId === orderId) {
      window.sessionStorage.removeItem(key);
      window.dispatchEvent(new Event("eventgate-checkout-context"));
    }
  } catch {
    /* Optional hint only. */
  }
}
export function subscribeCheckoutContext(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("eventgate-checkout-context", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("eventgate-checkout-context", listener);
  };
}
export const checkoutContextHint = () => recentCheckout()?.orderId ?? null;
