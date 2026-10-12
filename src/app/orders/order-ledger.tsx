"use client";
import { useUrlFilters } from "@/components/url-filters";
import { orderListFilterSchema } from "@/lib/filter-schemas";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import {
  DataTable,
  FilterBar,
  Select,
  Skeleton,
  StatusBadge,
  LinkButton,
} from "@/components/ui";
import { ErrorState, Pagination } from "@/components/ui/interactive";
import { EmptyState } from "@/components/empty-state";
import { getOrders } from "@/lib/order-api";
import { privateKey } from "@/lib/query-keys";
import { formatCurrency, formatEventDate } from "@/lib/format";
export function OrderLedger() {
  const { session } = useAuth();
  const filters = useUrlFilters(orderListFilterSchema);
  const { page, status = "" } = filters.values;
  const setPage = filters.setPage;
  const query = useQuery({
    queryKey: privateKey("orders", session?.user.id, "list", { page, status }),
    enabled: !!session && filters.valid,
    queryFn: () =>
      getOrders(
        new URLSearchParams({
          page: String(page),
          limit: "20",
          ...(status ? { status } : {}),
        }),
      ),
  });
  return (
    <section>
      <h1>Your order ledger</h1>
      <p>Review reservations, payments, and past bookings.</p>
      <FilterBar>
        <label>
          Status{" "}
          <Select
            value={status}
            onChange={(event) => {
              filters.update("status", event.target.value);
            }}
          >
            <option value="">All orders</option>
            {[
              "PENDING_PAYMENT",
              "PAID",
              "REFUNDED",
              "CANCELLED",
              "EXPIRED",
            ].map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </label>
      </FilterBar>
      {!filters.valid ? (
        <p role="alert">{filters.error}</p>
      ) : query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : !query.data.orders.length ? (
        <EmptyState
          title="No orders here yet."
          description="Choose an event to start a reservation."
          action={<LinkButton href="/events">Browse events</LinkButton>}
        />
      ) : (
        <>
          <DataTable
            caption="Your bookings"
            rows={query.data.orders}
            rowKey={(order) => order.id}
            columns={[
              {
                key: "event",
                label: "Event",
                cell: (order) => (
                  <Link href={`/orders/${order.id}`}>
                    {order.eventNameSnapshot}
                  </Link>
                ),
              },
              {
                key: "status",
                label: "Status",
                cell: (order) => <StatusBadge status={order.status} />,
              },
              {
                key: "tier",
                label: "Tickets",
                cell: (order) =>
                  `${order.quantity} × ${order.ticketTierNameSnapshot}`,
              },
              {
                key: "amount",
                label: "Total",
                cell: (order) => formatCurrency(order.totalAmountPaisaSnapshot),
              },
              {
                key: "date",
                label: "Booked",
                cell: (order) => formatEventDate(order.createdAt),
              },
            ]}
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
