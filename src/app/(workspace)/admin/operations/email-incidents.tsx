"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { getEmailIncidents } from "@/lib/notifications-api";
import { privateKey } from "@/lib/query-keys";
import { usePageVisible } from "@/lib/use-page-visible";
import { formatEventDate } from "@/lib/format";
import { Button, DataTable, StatusBadge, Skeleton } from "@/components/ui";
import { Pagination } from "@/components/ui/interactive";
import { ReadFailure } from "@/components/read-failure";
import styles from "@/components/notifications.module.css";
export function EmailIncidents() {
  const { session } = useAuth();
  const [page, setPage] = useState(1);
  const visible = usePageVisible();
  const query = useQuery({
    queryKey: privateKey("admin-email-incidents", session?.user.id, "list", {
      page,
    }),
    queryFn: () => getEmailIncidents(page),
    enabled: session?.user.role === "ADMIN" && visible,
    refetchInterval: visible ? 30000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  });
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>Email delivery incidents</h2>
        <Button
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh incidents
        </Button>
      </div>
      <p>
        The durable worker retries eligible deliveries with the same provider
        key and a bounded retry budget. An unknown result is not proof of
        delivery. Expired idempotency windows are not force-retried.
      </p>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ReadFailure
          error={query.error}
          retry={() => void query.refetch()}
          fetching={query.isFetching}
          next="/admin/operations"
        />
      ) : page > Math.max(1, query.data.meta.totalPages) ? (
        <Button onClick={() => setPage(1)}>Reset unavailable page</Button>
      ) : (
        <>
          {query.data.summary?.emailAvailable === 0 && (
            <p role="status">
              Email delivery is disabled: configure the backend provider and
              sender. In-app updates are independent.
            </p>
          )}
          {!query.data.data.length ? (
            <p>No failed or unknown email deliveries are recorded.</p>
          ) : (
            <DataTable
              caption="Failed and unconfirmed email deliveries"
              rows={query.data.data}
              rowKey={(row) => row.id}
              columns={[
                {
                  key: "notice",
                  label: "Notification / recipient account",
                  cell: (row) => (
                    <>
                      {row.notification.title}
                      <br />
                      <Link href={`/admin/users/${row.notification.userId}`}>
                        Inspect account
                      </Link>
                      <br />
                      <small>{row.id}</small>
                    </>
                  ),
                },
                {
                  key: "state",
                  label: "Outcome",
                  cell: (row) => <StatusBadge status={row.state} />,
                },
                {
                  key: "attempts",
                  label: "Attempts / next retry",
                  cell: (row) => (
                    <>
                      {row.attempts}
                      <br />
                      {row.nextAttemptAt
                        ? formatEventDate(row.nextAttemptAt)
                        : "No automatic retry scheduled"}
                    </>
                  ),
                },
                {
                  key: "reason",
                  label: "Safe failure reason",
                  cell: (row) =>
                    row.error?.replaceAll("_", " ").toLowerCase() ??
                    "Requires provider investigation",
                },
                {
                  key: "created",
                  label: "Created (Dhaka)",
                  cell: (row) => formatEventDate(row.createdAt),
                },
              ]}
            />
          )}
          <Pagination
            page={page}
            totalPages={query.data.meta.totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
