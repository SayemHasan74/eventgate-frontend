"use client";
import { useState, type ReactNode } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { apiList } from "@/lib/api-client";
import { privateKey } from "@/lib/query-keys";
import { paymentAttemptSchema } from "@/lib/api-schemas";
import { formatCurrency, formatEventDate } from "@/lib/format";
import {
  DataTable,
  Button,
  Input,
  FilterBar,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import { ErrorState, Pagination } from "@/components/ui/interactive";
import { EmptyState } from "@/components/empty-state";
type Kind = "events" | "payments" | "audit-logs";
const eventSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]),
  city: z.string(),
  startAt: z.iso.datetime({ offset: true }),
});
const auditSchema = z.object({
  id: z.uuid(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  actor: z.object({ displayName: z.string() }).nullable(),
});
const config = {
  events: {
    title: "Platform events",
    description: "Review event lifecycle, location, and scheduled dates.",
    columns: ["Event", "Status", "City", "Starts"],
  },
  payments: {
    title: "Payment attempts",
    description:
      "Inspect verified and unresolved transactions. A pending attempt is not a confirmed payment.",
    columns: ["Transaction", "Status", "Order", "Amount", "Initiated"],
  },
  "audit-logs": {
    title: "Audit trail",
    description:
      "Review recorded changes and the account responsible for each action.",
    columns: ["Action", "Actor", "Entity", "Record", "Time"],
  },
};
async function records(kind: Kind, page: number, search: string) {
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    ...(search
      ? { [kind === "audit-logs" ? "action" : "search"]: search }
      : {}),
  });
  if (kind === "events") {
    const result = await apiList("/api/admin/events?" + params, eventSchema);
    return {
      meta: result.meta,
      rows: result.data.map((row) => ({
        id: row.id,
        cells: [
          row.title,
          <StatusBadge key="status" status={row.status} />,
          row.city,
          formatEventDate(row.startAt),
        ],
      })),
    };
  }
  if (kind === "payments") {
    const result = await apiList(
      "/api/admin/payments?" + params,
      paymentAttemptSchema,
    );
    return {
      meta: result.meta,
      rows: result.data.map((row) => ({
        id: row.id,
        cells: [
          row.merchantTransactionId,
          <StatusBadge key="status" status={row.status} />,
          row.orderId,
          formatCurrency(row.amountPaisa),
          formatEventDate(row.initiatedAt),
        ],
      })),
    };
  }
  const result = await apiList(
    "/api/admin/reports/audit-logs?" + params,
    auditSchema,
  );
  return {
    meta: result.meta,
    rows: result.data.map((row) => ({
      id: row.id,
      cells: [
        row.action,
        row.actor?.displayName ?? "System",
        row.entityType,
        row.entityId ?? "—",
        formatEventDate(row.createdAt),
      ],
    })),
  };
}
export function AdminRecordList({ kind }: { kind: Kind }) {
  const { session } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const settings = config[kind];
  const query = useQuery({
    queryKey: privateKey("admin-" + kind, session?.user.id, "list", {
      page,
      search,
    }),
    queryFn: () => records(kind, page, search),
    enabled: !!session,
  });
  return (
    <section>
      <h1>{settings.title}</h1>
      <p>{settings.description}</p>
      <FilterBar>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(draft.trim());
            setPage(1);
          }}
        >
          <label>
            {kind === "audit-logs" ? "Exact action" : "Search"}
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <Button type="submit">Apply</Button>
        </form>
      </FilterBar>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : !query.data.rows.length ? (
        <EmptyState
          title="No matching records."
          description="Change the filter to see other records."
        />
      ) : (
        <>
          <DataTable<{ id: string; cells: ReactNode[] }>
            caption={settings.title}
            rows={query.data.rows}
            rowKey={(row) => row.id}
            columns={settings.columns.map((label, index) => ({
              key: label,
              label,
              cell: (row) => row.cells[index],
            }))}
          />
          <Pagination
            page={page}
            totalPages={query.data.meta.totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  );
}
