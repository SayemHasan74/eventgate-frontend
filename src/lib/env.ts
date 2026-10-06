const defaultApiBaseUrl = "http://localhost:4000/api/v1";

export const appConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
