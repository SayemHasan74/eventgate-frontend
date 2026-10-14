import { z } from "zod";

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.enum(["ATTENDEE", "ORGANIZER", "ADMIN"]),
});
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthSession = { user: AuthUser };
