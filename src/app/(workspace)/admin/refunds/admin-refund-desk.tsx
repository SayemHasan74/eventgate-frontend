"use client";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useUrlFilters, QueryFilterForm } from "@/components/url-filters";
import { refundListFilterSchema } from "@/lib/filter-schemas";
import {
  getAdminRefunds,
  retryAdminRefund,
  type AdminRefund,
} from "@/lib/admin-refund-api";
import { requestReconciliation } from "@/lib/admin-workflow-api";
import { privateKey, invalidateMutation } from "@/lib/query-keys";
import { AdminAction } from "@/components/admin-action";
import {
  Button,
  Field,
  Input,
  Select,
  FilterBar,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import { ErrorState, Pagination } from "@/components/ui/interactive";
import { formatMoney, formatEventDate } from "@/lib/format";
import { RefundReviewForm } from "./refund-review-form";
import styles from "../admin-workflows.module.css";
export function AdminRefundDesk() {
  const { session } = useAuth();
  const filters = useUrlFilters(refundListFilterSchema);
  const values = filters.values;
  const params = new URLSearchParams({
    page: String(values.page),
    limit: "20",
  });
  if (values.status) params.set("status", values.status);
  if (values.search) params.set("search", values.search);
  const query = useQuery({
    queryKey: privateKey("admin-refunds", session?.user.id, "list", {
      filters: params.toString(),
    }),
    queryFn: ({ signal }) => getAdminRefunds(params, signal),
    enabled: session?.user.role === "ADMIN" && filters.valid,
    retry: false,
  });
  return (
    <section className={styles.page}>
      <h1>Refund operations</h1>
      <p>
        Only REQUESTED refunds are reviewed. Provider-confirmed failures may be
        retried. Unknown outcomes need verification or merchant-portal
        investigation, never a second speculative refund.
      </p>
      <QueryFilterForm key={JSON.stringify(values)}>
        <input type="hidden" name="page" value="1" />
        <FilterBar>
          <Field label="Event search">
            <Input name="search" defaultValue={values.search} />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={values.status ?? ""}>
              <option value="">All statuses</option>
              {[
                "REQUESTED",
                "APPROVED",
                "REJECTED",
                "PROCESSING",
                "SUCCEEDED",
                "FAILED",
                "UNKNOWN",
              ].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </Select>
          </Field>
          <Button type="submit">Apply</Button>
        </FilterBar>
      </QueryFilterForm>
      <Link href="/admin/refunds">Clear filters</Link>
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
          <p>{query.data.total} matching refunds</p>
          {!query.data.refunds.length && <p>No refunds match these filters.</p>}
          {query.data.refunds.map((refund) => (
            <article key={refund.id} className={styles.panel}>
              <Link href={`/admin/refunds/${refund.id}`}>
                <h2>Refund {refund.id.slice(0, 8)}</h2>
              </Link>
              <StatusBadge status={refund.status} />
              <p>
                {formatMoney(refund.amountPaisa)} · requested{" "}
                {formatEventDate(refund.requestedAt)}
              </p>
              <Link href={`/admin/orders/${refund.orderId}`}>
                Inspect order
              </Link>
              <RefundOperations refund={refund} />
            </article>
          ))}
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
export function RefundOperations({ refund }: { refund: AdminRefund }) {
  const { session } = useAuth();
  const client = useQueryClient();
  const run = async (operation: () => Promise<unknown>) => {
    try {
      return await operation();
    } finally {
      if (session)
        await Promise.all([
          invalidateMutation(client, session.user.id, "refund"),
          invalidateMutation(client, session.user.id, "admin"),
        ]);
    }
  };
  return (
    <div className={styles.actions}>
      {refund.userMessage && <p>Attendee message: {refund.userMessage}</p>}
      {refund.reviewerNote && <p>Reviewer: {refund.reviewerNote}</p>}
      {refund.failureMessage && <p role="status">{refund.failureMessage}</p>}
      {refund.needsInvestigation && (
        <p role="alert">
          Requires merchant-portal investigation. Do not initiate another refund
          to discover its outcome.
        </p>
      )}
      {refund.status === "REQUESTED" && !refund.needsInvestigation && (
        <RefundReviewForm refundId={refund.id} />
      )}
      {refund.status === "FAILED" &&
        !refund.needsInvestigation &&
        [
          "PROVIDER_REFUND_REJECTED",
          "PROVIDER_REFUND_CONFIRMED_FAILED",
        ].includes(refund.failureCode ?? "") && (
          <AdminAction
            label="Retry confirmed failure"
            description="Request another initiation only after the provider definitively confirmed failure. The server rechecks capture/state before contacting the provider."
            onConfirm={(reason) =>
              run(() => retryAdminRefund(refund.id, reason))
            }
          />
        )}
      {["UNKNOWN", "PROCESSING"].includes(refund.status) && (
        <AdminAction
          label="Schedule verification"
          description="Queue provider status verification. This cannot force success or restart an uncertain refund. Missing provider references require manual merchant-portal investigation."
          onConfirm={(reason) =>
            run(() => requestReconciliation("refunds", refund.id, reason))
          }
        />
      )}
    </div>
  );
}
