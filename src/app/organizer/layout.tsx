import { ProtectedLayout } from "@/components/protected-layout";
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ProtectedLayout next="/organizer" roles={["ORGANIZER", "ADMIN"]}>
      {children}
    </ProtectedLayout>
  );
}
