import { z } from "zod";
import { apiClient, jsonBody } from "./api-client";

export type Profile = {
  id: string;
  email: string;
  displayName: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  role: string;
  status: string;
  createdAt: string;
  googleLinked: boolean;
  passwordLoginEnabled: boolean;
};

export type CheckoutProfileInput = Pick<
  Profile,
  "phone" | "address" | "city" | "postalCode" | "country"
>;

export { ApiError as ProfileApiError } from "./api-error";
const profileSchema: z.ZodType<Profile> = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string().nullable(),
  role: z.enum(["ATTENDEE", "ORGANIZER", "ADMIN"]),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  createdAt: z.iso.datetime({ offset: true }),
  googleLinked: z.boolean(),
  passwordLoginEnabled: z.boolean().default(false),
});
export const getProfile = () => apiClient("/api/users/me", profileSchema);
export const updateCheckoutProfile = (input: CheckoutProfileInput) =>
  apiClient("/api/users/me", profileSchema, {
    method: "PATCH",
    ...jsonBody(input),
  });
export const updateProfile = (
  input: CheckoutProfileInput & { displayName: string },
) =>
  apiClient("/api/users/me", profileSchema, {
    method: "PATCH",
    ...jsonBody(input),
  });
