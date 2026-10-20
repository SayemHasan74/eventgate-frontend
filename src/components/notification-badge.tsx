"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth-provider";
import { getUnreadCount } from "@/lib/notifications-api";
import { privateKey } from "@/lib/query-keys";
import { usePageVisible } from "@/lib/use-page-visible";
import styles from "./notifications.module.css";
export function NotificationBadge() {
  const { session } = useAuth();
  const visible = usePageVisible();
  const onHistory = usePathname() === "/notifications";
  const query = useQuery({
    queryKey: privateKey("notifications", session?.user.id, "unread-count"),
    queryFn: getUnreadCount,
    enabled: !!session && visible,
    refetchInterval: visible && !onHistory ? 30000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const unread = query.data?.unread;
  return (
    <Link
      className={styles.bell}
      href="/notifications"
      aria-label={
        query.isError
          ? "Notifications: count unavailable"
          : `Notifications${unread === undefined ? "" : `: ${unread} unread`}`
      }
    >
      <Bell size={18} />
      <span>Notifications</span>
      <strong>
        {query.isError
          ? "?"
          : unread === undefined
            ? "…"
            : unread > 99
              ? "99+"
              : unread}
      </strong>
    </Link>
  );
}
