import { z } from "zod";
import { apiClient, jsonBody } from "./api-client";
const day = z.iso.date();
export const aiFiltersSchema = z
  .object({
    search: z.string().min(1).max(120).optional(),
    city: z.string().min(1).max(100).optional(),
    category: z.string().min(1).max(80).optional(),
    startDate: day.optional(),
    endDate: day.optional(),
    maxPricePaisa: z.number().int().min(0).max(100_000_000).optional(),
  })
  .strict();
export const searchInterpretationSchema = z.object({
  matched: z.boolean(),
  message: z.string().max(600),
  filters: aiFiltersSchema,
  cached: z.boolean(),
});
export const eventAnswerSchema = z.object({
  answered: z.boolean(),
  message: z.string().max(600),
  cached: z.boolean(),
  sources: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        text: z.string().max(5000),
        href: z
          .string()
          .regex(/^\/events\/[a-z0-9]+(?:-[a-z0-9]+)*(?:#[a-zA-Z0-9-]+)?$/),
      }),
    )
    .max(4),
});
export function aiSearchHref(filters: z.infer<typeof aiFiltersSchema>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(aiFiltersSchema.parse(filters)))
    if (value !== undefined) params.set(key, String(value));
  return "/events?" + params.toString();
}
export const getAiConfig = () =>
  apiClient("/api/ai/config", z.object({ enabled: z.boolean() }));
export const interpretEventSearch = (question: string) =>
  apiClient("/api/ai/search", searchInterpretationSchema, {
    method: "POST",
    ...jsonBody({ question }),
  });
export const askEvent = (slug: string, question: string) =>
  apiClient("/api/ai/ask", eventAnswerSchema, {
    method: "POST",
    ...jsonBody({ slug, question }),
  });
