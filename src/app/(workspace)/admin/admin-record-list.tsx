"use client";
import Link from "next/link";
import { z } from "zod";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useUrlFilters } from "@/components/url-filters";
import { adminRecordFilterSchema } from "@/lib/filter-schemas";
import { adminDateParams, adminAuditSchema } from "@/lib/admin-workflow-api";
import { apiList } from "@/lib/api-client";
import { paymentAttemptSchema } from "@/lib/api-schemas";
import { privateKey } from "@/lib/query-keys";
import { formatMoney, formatEventDate } from "@/lib/format";
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
import styles from "./admin-workflows.module.css";
type Kind = "events" | "payments" | "audit-logs";
const titles = {
  events: "Platform events",
  payments: "Payment attempts",
  "audit-logs": "Audit trail",
};
const statuses = {
  events: ["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"],
  payments: [
    "INITIATING",
    "PENDING",
    "SUCCEEDED",
    "FAILED",
    "CANCELLED",
    "UNKNOWN",
  ],
  "audit-logs": [],
};
const eventSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  organizerId: z.uuid(),
  status: z.string(),
  city: z.string(),
  startAt: z.iso.datetime({ offset: true }),
});
async function records(
  kind: Kind,
  params: URLSearchParams,
): Promise<{
  rows: Array<{ id: string; cells: ReactNode[] }>;
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  if (kind === "events") {
    const result = await apiList(`/api/admin/events?${params}`, eventSchema);
    return {
      meta: result.meta,
      rows: result.data.map((row) => ({
        id: row.id,
        cells: [
          <Link key="title" href={`/admin/events/${row.id}`}>
            {row.title}
          </Link>,
          <StatusBadge key="status" status={row.status} />,
          <Link key="organizer" href={`/admin/users/${row.organizerId}`}>
            {row.organizerId}
          </Link>,
          row.city,
          formatEventDate(row.startAt),
        ],
      })),
    };
  }
  if (kind === "payments") {
    const result = await apiList(
      `/api/admin/payments?${params}`,
      paymentAttemptSchema,
    );
    return {
      meta: result.meta,
      rows: result.data.map((row) => ({
        id: row.id,
        cells: [
          <Link key="ref" href={`/admin/payments/${row.id}`}>
            {row.merchantTransactionId}
          </Link>,
          <StatusBadge key="status" status={row.status} />,
          <Link key="order" href={`/admin/orders/${row.orderId}`}>
            {row.orderId}
          </Link>,
          formatMoney(row.amountPaisa),
          formatEventDate(row.initiatedAt),
        ],
      })),
    };
  }
  const result = await apiList(
    `/api/admin/reports/audit-logs?${params}`,
    adminAuditSchema,
  );
  return {
    meta: result.meta,
    rows: result.data.map((row) => ({
      id: row.id,
      cells: [
        <Link key="action" href={`/admin/audit-logs/${row.id}`}>
          {row.action}
        </Link>,
        row.actor ? (
          <Link key="actor" href={`/admin/users/${row.actor.id}`}>
            {row.actor.displayName}
          </Link>
        ) : (
          "System"
        ),
        row.entityType,
        row.entityId,
        formatEventDate(row.createdAt),
      ],
    })),
  };
}
export function AdminRecordList({ kind }: { kind: Kind }) {
  const { session } = useAuth();
  const filters = useUrlFilters(adminRecordFilterSchema);
  const values = filters.values;
  const params = adminDateParams(values);
  params.set("page", String(values.page));
  params.set("limit", "20");
  if (values.search)
    params.set(kind === "audit-logs" ? "action" : "search", values.search);
  for (const key of kind === "audit-logs"
    ? (["actorId", "entityId", "entityType"] as const)
    : kind === "events"
      ? (["status", "organizerId"] as const)
      : (["status"] as const)) {
    const value = values[key];
    if (value) params.set(key, value);
  }
  const query = useQuery({
    queryKey: privateKey(`admin-${kind}`, session?.user.id, "list", {
      query: params.toString(),
    }),
    queryFn: () => records(kind, params),
    enabled: session?.user.role === "ADMIN" && filters.valid,
    retry: false,
  });
  const columns =
    kind === "events"
      ? ["Event", "Status", "Organizer", "City", "Starts (Dhaka)"]
      : kind === "payments"
        ? [
            "Merchant reference",
            "Status",
            "Order",
            "Amount BDT",
            "Initiated (Dhaka)",
          ]
        : ["Action", "Actor", "Entity", "Record", "Time (Dhaka)"];
  return (
    <section className={styles.page}>
      <h1>{titles[kind]}</h1>
      <p>
        {kind === "events"
          ? "Review events by owner, lifecycle and scheduled start."
          : kind === "payments"
            ? "Inspect provider verification and captured-money identity. Unknown is not confirmed paid."
            : "Exact action/actor/entity filters; detail records omit credentials and raw callback payloads."}
      </p>
      <form method="GET" key={JSON.stringify(values)}>
        <input type="hidden" name="page" value="1" />
        <FilterBar>
          <Field label={kind === "audit-logs" ? "Exact action" : "Search"}>
            <Input name="search" defaultValue={values.search} maxLength={120} />
          </Field>
          {!!statuses[kind].length && (
            <Field label="Status">
              <Select name="status" defaultValue={values.status ?? ""}>
                <option value="">All statuses</option>
                {statuses[kind].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </Select>
            </Field>
          )}
          {kind === "events" && (
            <Field label="Organizer ID">
              <Input name="organizerId" defaultValue={values.organizerId} />
            </Field>
          )}
          {kind === "audit-logs" && (
            <>
              <Field label="Actor ID">
                <Input name="actorId" defaultValue={values.actorId} />
              </Field>
              <Field label="Entity type">
                <Input name="entityType" defaultValue={values.entityType} />
              </Field>
              <Field label="Entity ID">
                <Input name="entityId" defaultValue={values.entityId} />
              </Field>
            </>
          )}
          <Field label="From (Dhaka date)">
            <Input
              name="startDate"
              type="date"
              defaultValue={values.startDate}
            />
          </Field>
          <Field label="Through (Dhaka date)">
            <Input name="endDate" type="date" defaultValue={values.endDate} />
          </Field>
          <Button type="submit">Apply</Button>
        </FilterBar>
      </form>
      <Link href={`/admin/${kind}`}>Clear filters</Link>
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
          <p>{query.data.meta.total} matching records</p>
          {query.data.rows.length ? (
            <DataTable<{ id: string; cells: ReactNode[] }>
              caption={titles[kind]}
              rows={query.data.rows}
              rowKey={(row) => row.id}
              columns={columns.map((label, index) => ({
                key: label,
                label,
                cell: (row) => row.cells[index],
              }))}
            />
          ) : (
            <p>No records match these filters.</p>
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
