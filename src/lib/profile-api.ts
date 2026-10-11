import { sessionFetch } from "./session-fetch";

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
};

export type CheckoutProfileInput = Pick<
  Profile,
  "phone" | "address" | "city" | "postalCode" | "country"
>;

type ApiResponse<T> = { success: true; data: T };
type ApiError = { message?: string; errors?: Array<{ message?: string }> };
export class ProfileApiError extends Error {}

async function profileRequest<T>(options?: RequestInit) {
  const response = await sessionFetch("/api/users/me", {
    ...options,
    headers: { ...options?.headers },
  });
  const payload = (await response.json().catch(() => ({}))) as
    ApiResponse<T> | ApiError;
  if (
    !response.ok ||
    !("success" in payload) ||
    !payload.success ||
    !("data" in payload)
  ) {
    const error = payload as ApiError;
    throw new ProfileApiError(
      error.errors?.[0]?.message ??
        error.message ??
        "Your profile could not be loaded.",
    );
  }
  return payload.data;
}

export const getProfile = () => profileRequest<Profile>();
export const updateCheckoutProfile = (input: CheckoutProfileInput) =>
  profileRequest<Profile>({
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
