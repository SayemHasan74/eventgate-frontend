const defaultApiBaseUrl = "https://eventgate-api.onrender.com/api/v1";

export const appConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://eventgate-frontend-lovat.vercel.app",
} as const;
