"use client";
import { useAuth } from "@/components/auth-provider";
import { LogoutButton } from "@/components/logout-button";

export function DemoSessionBanner() {
  const { session } = useAuth();
  if (!session?.user.isDemo) return null;
  return (
    <aside className="demo-session-banner" role="status">
      <span><strong>Shared demo account</strong> — sandbox payments only. Profile and contact changes are disabled.</span>
      <LogoutButton />
    </aside>
  );
}
