import { ProtectedLayout } from "@/components/protected-layout";
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ProtectedLayout next="/tickets" roles={["ATTENDEE"]}>
      {children}
    </ProtectedLayout>
  );
}
