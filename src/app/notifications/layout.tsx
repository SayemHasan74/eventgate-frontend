import { ProtectedLayout } from "@/components/protected-layout";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Notifications | EventGate",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout next="/notifications">{children}</ProtectedLayout>;
}
