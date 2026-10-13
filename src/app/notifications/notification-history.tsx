"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useUrlFilters } from "@/components/url-filters";
import {
  getNotifications,
  notificationFilters,
  readNotification,
} from "@/lib/notifications-api";
import { privateKey, invalidateMutation } from "@/lib/query-keys";
import { usePageVisible } from "@/lib/use-page-visible";
import { Button, Field, Select, FilterBar, Skeleton } from "@/components/ui";
import { Pagination } from "@/components/ui/interactive";
import { ReadFailure } from "@/components/read-failure";
import { formatEventDate } from "@/lib/format";
import styles from "@/components/notifications.module.css";
export function NotificationHistory() {
  const { session } = useAuth();
  const client = useQueryClient();
  const visible = usePageVisible();
  const filters = useUrlFilters(notificationFilters);
  const params = new URLSearchParams({
    page: String(filters.values.page),
    limit: "20",
    read: filters.values.read,
  });
  if (filters.values.type) params.set("type", filters.values.type);
  const query = useQuery({
    queryKey: privateKey("notifications", session?.user.id, "history", {
      query: params.toString(),
    }),
    queryFn: () => getNotifications(params),
    enabled: !!session && filters.valid && visible,
    refetchInterval: visible ? 30000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const lock = useRef(false);
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  async function mark(id?: string) {
    if (!session || lock.current) return;
    lock.current = true;
    setPending(id ?? "all");
    setMessage("");
    try {
      await readNotification(id);
      await invalidateMutation(client, session.user.id, "notification");
      setMessage(
        id ? "Marked as read." : "All current notifications marked as read.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update notifications.",
      );
    } finally {
      lock.current = false;
      setPending("");
    }
  }
  return (
    <section>
      <div className={styles.header}>
        <div>
          <h1>Your notification inbox</h1>
          <p>Booking, refund, event and account updates, kept together.</p>
        </div>
        <Link href="/account/profile">Notification preferences</Link>
      </div>
      <form method="GET" key={JSON.stringify(filters.values)}>
        <input type="hidden" name="page" value="1" />
        <FilterBar>
          <Field label="Read status">
            <Select name="read" defaultValue={filters.values.read}>
              <option value="all">All messages</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </Select>
          </Field>
          <Field label="Update type">
            <Select name="type" defaultValue={filters.values.type ?? ""}>
              <option value="">All types</option>
              {[
                "BOOKING_PAID",
                "EVENT_CANCELLED",
                "REFUND_UPDATE",
                "ROLE_CHANGED",
                "EMAIL_VERIFICATION",
                "SAVED_SALE_REMINDER",
                "SAVED_EVENT_REMINDER",
                "BOOKING_REMINDER",
              ].map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ").toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit">Filter inbox</Button>
        </FilterBar>
      </form>
      <p role="status">{message}</p>
      {!filters.valid ? (
        <p role="alert">{filters.error}</p>
      ) : query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ReadFailure
          error={query.error}
          retry={() => void query.refetch()}
          fetching={query.isFetching}
          next="/notifications"
        />
      ) : filters.values.page > Math.max(1, query.data.meta.totalPages) ? (
        <Button onClick={() => filters.setPage(1)}>
          Reset unavailable page
        </Button>
      ) : (
        <>
          <div className={styles.header}>
            <p>
              {query.data.summary?.unread ?? "Unavailable"} unread ·{" "}
              {query.data.meta.total} matching updates
            </p>
            <Button
              disabled={!!pending || !query.data.summary?.unread}
              onClick={() => void mark()}
            >
              {pending === "all" ? "Updating…" : "Mark all as read"}
            </Button>
          </div>
          {!query.data.data.length ? (
            <section className={styles.panel}>
              <h2>No matching notifications</h2>
              <p>
                Updates appear when activity happens. Change filters if you are
                looking for an older message.
              </p>
            </section>
          ) : (
            <ul className={styles.list}>
              {query.data.data.map((notice) => (
                <li
                  className={styles.notice}
                  data-unread={!notice.readAt}
                  key={notice.id}
                >
                  <small>
                    {notice.readAt ? "Read" : "Unread"} ·{" "}
                    {formatEventDate(notice.createdAt)}
                  </small>
                  <h2>{notice.title}</h2>
                  <p>{notice.body}</p>
                  <div className={styles.actions}>
                    <Link className="text-link" href={notice.actionPath}>
                      Open related record →
                    </Link>
                    {!notice.readAt && (
                      <Button
                        disabled={!!pending}
                        onClick={() => void mark(notice.id)}
                      >
                        {pending === notice.id ? "Updating…" : "Mark as read"}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={filters.values.page}
            totalPages={query.data.meta.totalPages}
            onPageChange={filters.setPage}
          />
        </>
      )}
    </section>
  );
}
