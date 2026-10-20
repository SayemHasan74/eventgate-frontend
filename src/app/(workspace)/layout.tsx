import { Suspense } from "react";
import { ProtectedLayout } from "@/components/protected-layout";
import { Skeleton } from "@/components/ui";
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="wrap" aria-busy="true">
          <p>Opening workspace…</p>
          <Skeleton />
        </main>
      }
    >
      <ProtectedLayout next="/account">{children}</ProtectedLayout>
    </Suspense>
  );
}
