import { ProtectedLayout } from "@/components/protected-layout";
import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ProtectedLayout next="/orders" roles={["ATTENDEE"]}>
      {children}
    </ProtectedLayout>
  );
}
