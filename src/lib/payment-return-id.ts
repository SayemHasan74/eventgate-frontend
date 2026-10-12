import { z } from "zod";
export function paymentReturnId(value: string | string[] | undefined) {
  const parsed = z.uuid().safeParse(value);
  return parsed.success ? parsed.data : null;
}
