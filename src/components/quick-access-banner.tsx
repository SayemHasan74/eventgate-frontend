"use client";

import { useAuth } from "./auth-provider";
import { LogoutButton } from "./logout-button";
import styles from "./quick-access-banner.module.css";

export function QuickAccessBanner() {
  const { session } = useAuth();
  if (!session?.user.isQuickAccess) return null;
  return (
    <aside className={styles.banner} role="status">
      <p>Shared access account. Actions affect the live application. Use your own account for personal details and bookings.</p>
      <LogoutButton />
    </aside>
  );
}
