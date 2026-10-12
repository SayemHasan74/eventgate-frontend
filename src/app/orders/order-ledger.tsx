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
  Input,
} from "@/components/ui";
import { Pagination } from "@/components/ui/interactive";
import { ReadFailure } from "@/components/read-failure";
import { EmptyState } from "@/components/empty-state";
import { getOrders } from "@/lib/order-api";
import { privateKey } from "@/lib/query-keys";
import { formatCurrency, formatEventDate, dhakaDayBounds } from "@/lib/format";
export function OrderLedger() {
  const { session } = useAuth();
  const filters = useUrlFilters(orderListFilterSchema);
  const {
    page,
    status = "",
    search = "",
    startDate = "",
    endDate = "",
  } = filters.values;
  const setPage = filters.setPage;
  const query = useQuery({
    queryKey: privateKey("orders", session?.user.id, "list", {
      page,
      status,
      search,
      startDate,
      endDate,
    }),
    enabled: session?.user.role === "ATTENDEE" && filters.valid,
    retry: false,
    queryFn: () =>
      getOrders(
        new URLSearchParams({
          page: String(page),
          limit: "20",
          ...(status ? { status } : {}),
          ...(search ? { search } : {}),
          ...(startDate ? { startAfter: dhakaDayBounds(startDate).start } : {}),
          ...(endDate ? { startBefore: dhakaDayBounds(endDate).end } : {}),
        }),
      ),
  });
  return (
    <section>
      <h1>Your order ledger</h1>
      <p>
        Review reservations and booking records. Issued QR passes live in your
        ticket wallet.
      </p>
      <FilterBar>
        <label>
          Search event or tier
          <Input
            type="search"
            maxLength={120}
            value={search}
            onChange={(event) => filters.update("search", event.target.value)}
          />
        </label>
        <label>
          Booked from (Bangladesh)
          <Input
            type="date"
            value={startDate}
            onChange={(event) =>
              filters.update("startDate", event.target.value)
            }
          />
        </label>
        <label>
          Booked through (Bangladesh)
          <Input
            type="date"
            value={endDate}
            onChange={(event) => filters.update("endDate", event.target.value)}
          />
        </label>
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
      <LinkButton href="/orders">Clear filters</LinkButton>
      {!filters.valid ? (
        <p role="alert">{filters.error}</p>
      ) : query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ReadFailure
          error={query.error}
          retry={() => void query.refetch()}
          fetching={query.isFetching}
          next="/orders"
        />
      ) : page > Math.max(1, query.data.meta.totalPages) ? (
        <EmptyState
          title="This result page no longer exists."
          description="Return to the first page without losing your filters."
          action={
            <button className="button" type="button" onClick={() => setPage(1)}>
              Reset page
            </button>
          }
        />
      ) : !query.data.orders.length ? (
        <EmptyState
          title="No matching orders."
          description="Try broader filters or browse events to start a reservation."
          action={<LinkButton href="/orders">Clear filters</LinkButton>}
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
                label: "Booking quantity / tier",
                cell: (order) =>
                  `${order.quantity} × ${order.ticketTierNameSnapshot}`,
              },
              {
                key: "amount",
                label: "Total",
                cell: (order) => formatCurrency(order.totalAmountPaisaSnapshot),
              },
              {
                key: "action",
                label: "Next step",
                cell: (order) => (
                  <Link href={`/orders/${order.id}`}>
                    {order.status === "PAID"
                      ? "Open order and passes"
                      : order.status === "PENDING_PAYMENT"
                        ? "Review hold / payment"
                        : order.status === "REFUNDED"
                          ? "View refund record"
                          : "View record / rebook"}
                  </Link>
                ),
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
