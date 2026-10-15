import { z } from "zod";
import { parseEnvelope, ApiError } from "./api-error";
export const publicAvailabilitySchema = z.object({
  eventId: z.uuid(),
  status: z.literal("PUBLISHED"),
  serverTime: z.iso.datetime({ offset: true }),
  ticketTiers: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      pricePaisa: z.number().int().positive(),
      capacity: z.number().int().positive(),
      availableQuantity: z.number().int().nonnegative(),
      salesStartAt: z.iso.datetime({ offset: true }),
      salesEndAt: z.iso.datetime({ offset: true }),
      salesPaused: z.boolean(),
      saleState: z.enum([
        "OPEN",
        "UPCOMING",
        "SOLD_OUT",
        "CLOSED",
        "PAUSED",
        "UNAVAILABLE",
      ]),
      canPurchase: z.boolean(),
    }),
  ),
});
export async function getFreshAvailability(slug: string) {
  try {
    const response = await fetch(
      `/api/events/${encodeURIComponent(slug)}/availability`,
      {
        cache: "no-store",
        // Deployment protection also uses same-origin cookies. Dropping them
        // can turn this public API read into a Vercel authentication redirect.
        credentials: "same-origin",
        signal: AbortSignal.timeout(20000),
      },
    );
    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("application/json") &&
      (response.status === 401 ||
        response.status === 403 ||
        response.redirected)
    ) {
      throw new ApiError(
        "This deployment requires hosting access. Open the production website, or sign in to Vercel and retry.",
        response.status,
        "DEPLOYMENT_ACCESS_REQUIRED",
      );
    }
    return parseEnvelope(
      response,
      await response.json(),
      publicAvailabilitySchema,
    ).data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Could not check current availability. No reservation was created. Please retry.",
    );
  }
}
