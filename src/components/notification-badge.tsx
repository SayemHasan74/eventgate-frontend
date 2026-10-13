"use client";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth-provider";
import { getNotifications } from "@/lib/notifications-api";
import { privateKey } from "@/lib/query-keys";
import { usePageVisible } from "@/lib/use-page-visible";
import styles from "./notifications.module.css";
export function NotificationBadge() {
  const { session } = useAuth();
  const visible = usePageVisible();
  const query = useQuery({
    queryKey: privateKey("notifications", session?.user.id, "badge"),
    queryFn: () => getNotifications(new URLSearchParams({ limit: "1" })),
    enabled: !!session && visible,
    refetchInterval: visible ? 30000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const unread = query.data?.summary?.unread;
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
