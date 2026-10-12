import { ApiError } from "./api-error";
export function readError(error: unknown) {
  if (!(error instanceof ApiError))
    return {
      title: "Temporary service problem",
      message: "This read could not complete. Retry when connected.",
      retry: true,
    };
  if (error.status === 401)
    return {
      title: "Sign-in required",
      message:
        "Your session needs renewal. Sign in again to view this private information.",
      retry: false,
    };
  if (error.status === 403)
    return {
      title: "Access unavailable",
      message: "This account is not permitted to view this information.",
      retry: false,
    };
  if (error.status === 404)
    return {
      title: "Not found",
      message: "This record is missing or is not available to your account.",
      retry: false,
    };
  if ([400, 422].includes(error.status))
    return {
      title: "Correct the request",
      message: error.message,
      retry: false,
    };
  if (error.status === 409)
    return {
      title: "Action conflicts with current state",
      message: error.message,
      retry: true,
    };
  return {
    title: "Temporary service problem",
    message: error.message,
    retry: true,
  };
}
