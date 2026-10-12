"use client";
import Link from "next/link";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { apiClient } from "@/lib/api-client";
import { privateKey } from "@/lib/query-keys";
import { MetricCard, Skeleton } from "@/components/ui";
import { ErrorState } from "@/components/ui/interactive";
import { formatMoney, formatEventDate } from "@/lib/format";
import styles from "./admin-workflows.module.css";
const count = z.number().int().nonnegative();
export function AdminDashboard() {
  const { session, isReady } = useAuth();
  if (!isReady) return <Skeleton />;
  if (session?.user.role !== "ADMIN")
    return <p>Administrator access required.</p>;
  return (
    <div className={styles.page}>
      <h1>Platform overview</h1>
      <p>
        Each panel loads independently. Canonical purchases, not currently paid
        orders, determine historical sales.
      </p>
      <div className={styles.metrics}>
        <CountPanel
          panel="users"
          title="Registered accounts"
          href="/admin/users"
          userId={session.user.id}
        />
        <CountPanel
          panel="events"
          title="Published events"
          href="/admin/events"
          userId={session.user.id}
        />
        <CountPanel
          panel="refunds"
          title="Refunds awaiting review"
          href="/admin/refunds?status=REQUESTED"
          userId={session.user.id}
        />
      </div>
      <SalesSummary userId={session.user.id} />
      <IncidentSummary userId={session.user.id} />
      <MaintenanceSummary userId={session.user.id} />
      <nav className={styles.actions}>
        <Link href="/admin/payments">Payment records</Link>
        <Link href="/admin/audit-logs">Audit trail</Link>
        <Link href="/admin/operations">Recovery jobs</Link>
      </nav>
    </div>
  );
}
function CountPanel({
  panel,
  title,
  href,
  userId,
}: {
  panel: string;
  title: string;
  href: string;
  userId: string;
}) {
  const query = useQuery({
    queryKey: privateKey("admin-stats", userId, panel, {}),
    queryFn: () =>
      apiClient(`/api/admin/reports/summary/${panel}`, z.object({ count })),
    retry: false,
  });
  return (
    <section className={styles.panel}>
      <h2>{title}</h2>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        <MetricCard label={title} value={query.data.count} />
      )}
      <Link href={href}>Open records</Link>
    </section>
  );
}
function SalesSummary({ userId }: { userId: string }) {
  const query = useQuery({
    queryKey: privateKey("admin-stats", userId, "sales", {}),
    queryFn: () =>
      apiClient(
        "/api/admin/reports/summary/sales",
        z.object({
          grossTicketSalesPaisa: count,
          bookingRefundsPaisa: count,
          netTicketSalesPaisa: z.number().int().safe(),
        }),
      ),
    retry: false,
  });
  return (
    <section className={styles.panel}>
      <h2>Canonical ticket sales · BDT</h2>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        <div className={styles.metrics}>
          <MetricCard
            label="Gross historical sales"
            value={formatMoney(query.data.grossTicketSalesPaisa)}
          />
          <MetricCard
            label="Successful booking refunds"
            value={formatMoney(query.data.bookingRefundsPaisa)}
          />
          <MetricCard
            label="Net ticket sales"
            value={formatMoney(query.data.netTicketSalesPaisa)}
          />
        </div>
      )}
      <p>
        Excess captures and pending refunds are not deducted as booking refunds.
        Gateway fees are not estimated.
      </p>
    </section>
  );
}
function IncidentSummary({ userId }: { userId: string }) {
  const query = useQuery({
    queryKey: privateKey("admin-operations", userId, "incidents", {}),
    queryFn: () =>
      apiClient(
        "/api/admin/reports/summary/incidents",
        z.object({ payments: count, refunds: count }),
      ),
    retry: false,
  });
  return (
    <section className={styles.panel}>
      <h2>Uncertain outcomes</h2>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        <div className={styles.metrics}>
          <MetricCard
            label="Unknown or stale payment attempts"
            value={query.data.payments}
          />
          <MetricCard
            label="Unknown/investigation refunds"
            value={query.data.refunds}
          />
        </div>
      )}
      <div className={styles.actions}>
        <Link href="/admin/payments?status=UNKNOWN">Unknown payments</Link>
        <Link href="/admin/payments?status=PENDING">Pending attempts</Link>
        <Link href="/admin/payments?status=INITIATING">
          Initiating attempts
        </Link>
        <Link href="/admin/refunds?status=UNKNOWN">
          Inspect unknown refunds
        </Link>
        <Link href="/admin/refunds">All refund investigations</Link>
      </div>
    </section>
  );
}
function MaintenanceSummary({ userId }: { userId: string }) {
  const query = useQuery({
    queryKey: privateKey("admin-maintenance", userId, "summary", {}),
    queryFn: () =>
      apiClient(
        "/api/admin/reports/maintenance",
        z.object({
          pending: count,
          failed: count,
          backlogAgeSeconds: z.number().nonnegative(),
          state: z.object({ heartbeatAt: z.string().nullable() }).nullable(),
          warnings: z.array(z.string()),
        }),
      ),
    retry: false,
  });
  return (
    <section className={styles.panel}>
      <h2>Maintenance backlog</h2>
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
            <MetricCard label="Failed jobs" value={query.data.failed} />
            <MetricCard
              label="Oldest due job (seconds)"
              value={query.data.backlogAgeSeconds}
            />
          </div>
          <p>
            Heartbeat:{" "}
            {query.data.state?.heartbeatAt
              ? formatEventDate(query.data.state.heartbeatAt)
              : "Not recorded"}
          </p>
          {query.data.warnings.map((warning) => (
            <p key={warning} role="status">
              {warning.replaceAll("_", " ")}
            </p>
          ))}
        </>
      )}
      <Link href="/admin/operations">Investigate recovery jobs</Link>
    </section>
  );
}
