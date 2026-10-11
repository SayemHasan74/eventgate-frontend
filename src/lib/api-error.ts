import { z } from "zod";

export type FieldError = { field?: string; code: string; message: string };
export class ApiError extends Error {
  readonly fieldErrors: Record<string, string[]>;
  constructor(
    message: string,
    public status = 0,
    public code = "API_UNAVAILABLE",
    public errors: FieldError[] = [],
    public requestId?: string,
    public retryAfter?: string,
    public sessionEnded = false,
  ) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = {};
    for (const error of errors)
      if (error.field)
        (this.fieldErrors[error.field] ??= []).push(error.message);
  }
}
const failureSchema = z.object({
  message: z.string().optional(),
  errors: z
    .array(
      z.object({
        field: z.string().optional(),
        code: z.string().optional(),
        message: z.string().optional(),
      }),
    )
    .optional(),
  data: z.object({ sessionEnded: z.boolean().optional() }).optional(),
});
export const safeMessage = (message: string) =>
  message
    .replace(/https?:\/\/[^\s<>"']+/gi, "[provider address]")
    .slice(0, 1000);
export function responseError(response: Response, payload: unknown) {
  const parsed = failureSchema.safeParse(payload);
  const data = parsed.success ? parsed.data : undefined;
  const errors = (data?.errors ?? []).map((error) => ({
    field: error.field?.replace(/^(body|query|params)\./, ""),
    code: error.code ?? "REQUEST_FAILED",
    message: safeMessage(error.message ?? data?.message ?? "Request failed."),
  }));
  const code =
    errors[0]?.code ??
    (response.status === 429 ? "RATE_LIMITED" : "REQUEST_FAILED");
  return new ApiError(
    safeMessage(data?.message ?? "The request could not be completed."),
    response.status,
    code,
    errors,
    response.headers.get("x-request-id") ?? undefined,
    safeRetryAfter(response.headers.get("retry-after")),
    data?.data?.sessionEnded === true,
  );
}
export function safeRetryAfter(value: string | null): string | undefined {
  if (!value) return undefined;
  if (/^\d{1,8}$/.test(value)) return value;
  return /^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(
    value,
  ) && Number.isFinite(Date.parse(value))
    ? value
    : undefined;
}
export const paginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type PaginationMeta = z.infer<typeof paginationSchema>;
export function parseEnvelope<T>(
  response: Response,
  payload: unknown,
  schema: z.ZodType<T>,
) {
  if (
    !response.ok ||
    (payload &&
      typeof payload === "object" &&
      "success" in payload &&
      payload.success === false)
  )
    throw responseError(response, payload);
  const result = z
    .object({
      success: z.literal(true),
      message: z.string().optional(),
      data: schema,
    })
    .safeParse(payload);
  if (!result.success)
    throw new ApiError(
      "The service returned an unexpected response.",
      response.status,
      "INVALID_API_RESPONSE",
      [],
      response.headers.get("x-request-id") ?? undefined,
    );
  return result.data;
}
