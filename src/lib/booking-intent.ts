"use client";
import { z } from "zod";
import { removeBrowserStorage } from "./browser-storage";

const key = "eventgate.booking-intent";
const schema = z.object({
  eventId: z.uuid(),
  slug: z.string().min(1).max(200),
  tierId: z.uuid(),
  quantity: z.number().int().min(1).max(10),
  createdAt: z.number().finite().positive(),
});
export type BookingIntent = z.infer<typeof schema>;
export function clearBookingIntent() {
  removeBrowserStorage("sessionStorage", key);
}
export function saveBookingIntent(
  intent: Omit<BookingIntent, "createdAt"> & { createdAt?: number },
) {
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify(
        schema.parse({ ...intent, createdAt: intent.createdAt ?? Date.now() }),
      ),
    );
    return true;
  } catch {
    return false;
  }
}
export function readBookingIntent(eventId: string, slug: string) {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = schema.safeParse(JSON.parse(raw));
    if (
      !parsed.success ||
      parsed.data.createdAt > Date.now() ||
      Date.now() - parsed.data.createdAt > 3600000
    ) {
      clearBookingIntent();
      return null;
    }
    return parsed.data.eventId === eventId && parsed.data.slug === slug
      ? parsed.data
      : null;
  } catch {
    clearBookingIntent();
    return null;
  }
}
