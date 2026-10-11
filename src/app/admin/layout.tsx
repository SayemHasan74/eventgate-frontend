import { ProtectedLayout } from "@/components/protected-layout";
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ProtectedLayout next="/admin" roles={["ADMIN"]}>
      {children}
    </ProtectedLayout>
  );
}
