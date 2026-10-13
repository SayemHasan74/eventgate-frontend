import { ProtectedLayout } from "@/components/protected-layout";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Saved events | EventGate",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedLayout roles={["ATTENDEE"]} next="/saved-events">
      {children}
    </ProtectedLayout>
  );
}
