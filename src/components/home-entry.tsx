"use client";
import { useLayoutEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { workspacePath } from "@/lib/navigation";
export function HomeEntry({ children }: { children: ReactNode }) {
  const { status, session } = useAuth();
  const router = useRouter();
  useLayoutEffect(() => {
    if (status === "authenticated" && session)
      router.replace(workspacePath(session.user.role));
  }, [status, session, router]);
  if (status === "anonymous") return children;
  return (
    <main id="main-content" className="wrap" aria-busy="true">
      <p role="status">
        {status === "unavailable"
          ? "Restore your session to continue."
          : "Opening EventGate…"}
      </p>
    </main>
  );
}
