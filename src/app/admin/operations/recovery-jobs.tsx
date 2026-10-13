"use client";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useUrlFilters } from "@/components/url-filters";
import { adminRecordFilterSchema } from "@/lib/filter-schemas";
import {
  getRecoveryJobs,
  retryRecoveryJob,
  adminRecordLink,
  adminDateParams,
} from "@/lib/admin-workflow-api";
import { privateKey, invalidateMutation } from "@/lib/query-keys";
import { formatEventDate } from "@/lib/format";
import { AdminAction } from "@/components/admin-action";
import {
  Button,
  Field,
  Input,
  Select,
  FilterBar,
  DataTable,
  StatusBadge,
  Skeleton,
} from "@/components/ui";
import { ErrorState, Pagination } from "@/components/ui/interactive";
import styles from "../admin-workflows.module.css";
export function RecoveryJobs() {
  const { session } = useAuth();
  const client = useQueryClient();
  const filters = useUrlFilters(adminRecordFilterSchema);
  const values = filters.values;
  const params = adminDateParams(values);
  params.set("page", String(values.page));
  params.set("limit", "20");
  if (values.status) params.set("status", values.status);
  if (values.type) params.set("type", values.type);
  if (values.jobId) params.set("id", values.jobId);
  const query = useQuery({
    queryKey: privateKey("admin-jobs", session?.user.id, "list", {
      query: params.toString(),
    }),
    queryFn: () => getRecoveryJobs(params),
    enabled: session?.user.role === "ADMIN" && filters.valid,
    retry: false,
  });
  return (
    <section className={styles.panel}>
      <h2>Durable recovery queue</h2>
      <p>
        Retries reuse the same job/source and preserve total attempts. Only
        FAILED jobs without an active lease can receive a fresh audited failure
        budget. Running, pending and completed work is never reset. Unknown
        refunds without a confirmed provider reference require investigation.
      </p>
      <form method="GET" key={JSON.stringify(values)}>
        <input type="hidden" name="page" value="1" />
        <FilterBar>
          <Field label="Job ID">
            <Input name="jobId" defaultValue={values.jobId} />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={values.status ?? ""}>
              <option value="">All statuses</option>
              {["PENDING", "RUNNING", "FAILED", "SUCCEEDED", "CANCELLED"].map(
                (status) => (
                  <option key={status}>{status}</option>
                ),
              )}
            </Select>
          </Field>
          <Field label="Type">
            <Select name="type" defaultValue={values.type ?? ""}>
              <option value="">All types</option>
              {[
                "EXPIRE_ORDER_RESERVATION",
                "RECONCILE_PAYMENT",
                "RECONCILE_PAYMENT_EVENT",
                "RECONCILE_REFUND",
                "PROCESS_EVENT_CANCELLATION",
                "COMPLETE_EVENT",
                "DELIVER_NOTIFICATION",
                "NOTIFY_EVENT_CANCELLATION",
                "SEND_EVENT_REMINDER",
                "REFRESH_EVENT_REMINDERS",
              ].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </Select>
          </Field>
          <Field label="Created from (Dhaka)">
            <Input
              name="startDate"
              type="date"
              defaultValue={values.startDate}
            />
          </Field>
          <Field label="Through (Dhaka)">
            <Input name="endDate" type="date" defaultValue={values.endDate} />
          </Field>
          <Button type="submit">Apply</Button>
        </FilterBar>
      </form>
      <Link href="/admin/operations">Clear filters</Link>
      {!filters.valid ? (
        <p role="alert">{filters.error}</p>
      ) : query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : values.page > Math.max(1, query.data.meta.totalPages) ? (
        <Button onClick={() => filters.setPage(1)}>
          Reset unavailable page
        </Button>
      ) : (
        <>
          <p>{query.data.meta.total} matching jobs</p>
          {!query.data.data.length ? (
            <p>No matching recovery jobs.</p>
          ) : (
            <DataTable
              caption="Safe recovery queue"
              rows={query.data.data}
              rowKey={(job) => job.id}
              columns={[
                {
                  key: "job",
                  label: "Job / source",
                  cell: (job) => (
                    <>
                      {job.type}
                      <br />
                      {job.id}
                      <br />
                      {job.reference &&
                      adminRecordLink(
                        job.reference.entityType,
                        job.reference.entityId,
                      ) ? (
                        <Link
                          href={adminRecordLink(
                            job.reference.entityType,
                            job.reference.entityId,
                          )!}
                        >
                          Inspect source
                        </Link>
                      ) : (
                        (job.reference?.entityId ?? "Source unavailable")
                      )}
                    </>
                  ),
                },
                {
                  key: "status",
                  label: "State",
                  cell: (job) => <StatusBadge status={job.status} />,
                },
                {
                  key: "runAt",
                  label: "Next run (Dhaka)",
                  cell: (job) => formatEventDate(job.runAt),
                },
                {
                  key: "attempts",
                  label: "Total attempts / failure budget",
                  cell: (job) =>
                    `${job.attempts} / ${job.failureAttempts} of ${job.maxAttempts}`,
                },
                {
                  key: "lease",
                  label: "Lease expires (Dhaka)",
                  cell: (job) =>
                    job.leaseExpiresAt
                      ? formatEventDate(job.leaseExpiresAt)
                      : "No lease",
                },
                {
                  key: "retry",
                  label: "Recovery",
                  cell: (job) =>
                    job.status === "FAILED" &&
                    job.type !== "DELIVER_NOTIFICATION" ? (
                      <AdminAction
                        label="Retry failed job"
                        disabled={!job.reference}
                        description="Requeue this exact durable job after the server checks source eligibility and its lease. No arbitrary code or payload can be submitted. Earlier failure attempts are retained in the audit record."
                        onConfirm={async (reason) => {
                          try {
                            return await retryRecoveryJob(job.id, reason);
                          } finally {
                            if (session)
                              await invalidateMutation(
                                client,
                                session.user.id,
                                "admin",
                              );
                          }
                        }}
                      />
                    ) : (
                      <Link
                        href={`/admin/audit-logs?entityType=JOB&entityId=${job.id}`}
                      >
                        Audit history
                      </Link>
                    ),
                },
              ]}
            />
          )}
          <Pagination
            page={values.page}
            totalPages={query.data.meta.totalPages}
            onPageChange={filters.setPage}
          />
        </>
      )}
    </section>
  );
}
