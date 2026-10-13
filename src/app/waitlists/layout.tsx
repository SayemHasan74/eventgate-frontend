import { ProtectedLayout } from "@/components/protected-layout";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Stock alerts | EventGate",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedLayout roles={["ATTENDEE"]} next="/waitlists">
      {children}
    </ProtectedLayout>
  );
}
