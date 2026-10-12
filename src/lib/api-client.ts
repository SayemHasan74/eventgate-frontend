import { z } from "zod";
import { sessionFetch } from "./session-fetch";
import { ApiError, paginationSchema, parseEnvelope } from "./api-error";
export { ApiError } from "./api-error";
async function request(path: string, init: RequestInit) {
  try {
    const headers = new Headers(init.headers);
    if (!headers.has("x-request-id"))
      headers.set("x-request-id", crypto.randomUUID());
    const response = await sessionFetch(path, {
      ...init,
      headers,
      signal:
        init.signal ??
        AbortSignal.timeout(
          path.split("?")[0].endsWith("/checkout") ? 45000 : 35000,
        ),
    });
    return {
      response,
      payload: (await response.json().catch(() => null)) as unknown,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "The service is unavailable. Please try again.",
      0,
      error instanceof Error &&
        ["TimeoutError", "AbortError"].includes(error.name)
        ? "API_TIMEOUT"
        : "API_UNAVAILABLE",
    );
  }
}
export async function apiClient<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
) {
  const { response, payload } = await request(path, init);
  return parseEnvelope(response, payload, schema).data;
}
export async function apiList<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
) {
  const { response, payload } = await request(path, init);
  const data = parseEnvelope(response, payload, z.array(schema)).data;
  const parsed = z
    .object({
      meta: paginationSchema,
      summary: z.record(z.string(), z.number().finite()).optional(),
    })
    .safeParse(payload);
  if (!parsed.success)
    throw new ApiError(
      "The service returned invalid pagination.",
      response.status,
      "INVALID_API_RESPONSE",
      [],
      response.headers.get("x-request-id") ?? undefined,
    );
  return { data, meta: parsed.data.meta, summary: parsed.data.summary };
}
export const jsonBody = (body: unknown): RequestInit => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
