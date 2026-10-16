import { z } from "zod";
import { moneySchema } from "./api-schemas";
import type { PublicEvent } from "./eventgate-api";
export const publicEventSchema: z.ZodType<PublicEvent> = z.object({
  status: z.enum(["PUBLISHED", "COMPLETED", "CANCELLED"]).default("PUBLISHED"),
  id: z.uuid(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  category: z.string(),
  venue: z.string(),
  city: z.string(),
  address: z.string(),
  startAt: z.iso.datetime({ offset: true }),
  endAt: z.iso.datetime({ offset: true }),
  imageUrl: z.string().nullable(),
  organizer: z.object({ displayName: z.string() }),
  ticketTiers: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      pricePaisa: moneySchema,
      capacity: z.number().int().nonnegative(),
      availableQuantity: z.number().int().nonnegative(),
      salesPaused: z.boolean().default(false),
      salesStartAt: z.iso.datetime({ offset: true }),
      salesEndAt: z.iso.datetime({ offset: true }),
    }),
  ),
});
