"use client";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { privateKey } from "@/lib/query-keys";
import { MetricCard, Button, Skeleton } from "@/components/ui";
import { ErrorState } from "@/components/ui/interactive";
import { formatEventDate } from "@/lib/format";
import styles from "@/components/workspace.module.css";
const schema = z.object({
  pending: z.number().int().nonnegative(),
  running: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  expiredLeases: z.number().int().nonnegative(),
  backlogAgeSeconds: z.number().nonnegative(),
  warnings: z.array(z.string()),
  timingNotice: z.string(),
  state: z
    .object({
      lastStartedAt: z.string().nullable(),
      lastCompletedAt: z.string().nullable(),
      lastFailure: z.string().nullable(),
    })
    .nullable(),
});
export function MaintenancePanel() {
  const { session } = useAuth();
  const query = useQuery({
    queryKey: privateKey("admin-maintenance", session?.user.id, "status", {}),
    queryFn: () => apiClient("/api/admin/reports/maintenance", schema),
    enabled: !!session,
  });
  return (
    <section>
      <h1>Operations & recovery</h1>
      <p>Inspect the embedded worker’s heartbeat, backlog, and failed work.</p>
      <Button onClick={() => void query.refetch()} disabled={query.isFetching}>
        Refresh status
      </Button>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        <>
          <div className={styles.metrics}>
            <MetricCard label="Pending jobs" value={query.data.pending} />
            <MetricCard label="Running" value={query.data.running} />
            <MetricCard label="Failed" value={query.data.failed} />
            <MetricCard
              label="Overdue leases"
              value={query.data.expiredLeases}
            />
          </div>
          <p>Oldest due job: {query.data.backlogAgeSeconds} seconds overdue.</p>
          <p>
            Last started:{" "}
            {query.data.state?.lastStartedAt
              ? formatEventDate(query.data.state.lastStartedAt)
              : "Not yet recorded"}
          </p>
          <p>
            Last completed:{" "}
            {query.data.state?.lastCompletedAt
              ? formatEventDate(query.data.state.lastCompletedAt)
              : "Not yet recorded"}
          </p>
          {query.data.warnings.length > 0 && (
            <section role="status">
              <h2>Needs attention</h2>
              <ul>
                {query.data.warnings.map((warning) => (
                  <li key={warning}>
                    {warning.replaceAll("_", " ").toLowerCase()}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {query.data.state?.lastFailure && (
            <p role="status">{query.data.state.lastFailure}</p>
          )}
          <p>{query.data.timingNotice}</p>
        </>
      )}
    </section>
  );
}
