"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Suspense, useState } from "react";
import { NavigationHistory } from "./navigation-history";
import { Toaster } from "sonner";

import { EventAi } from "./event-ai";

import { AuthProvider } from "@/components/auth-provider";

type ProvidersProps = Readonly<{ children: React.ReactNode }>;

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Suspense fallback={null}>
            <NavigationHistory />
          </Suspense>
          {children}
          <EventAi />
        </AuthProvider>
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
