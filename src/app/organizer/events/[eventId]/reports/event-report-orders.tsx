"use client";
import { useQuery } from "@tanstack/react-query";
import { DataTable, Skeleton, StatusBadge } from "@/components/ui";
import { ErrorState, Pagination } from "@/components/ui/interactive";
import { getEventOrders } from "@/lib/organizer-api";
import { eventOrdersExportUrl } from "@/lib/event-report-api";
import { privateKey } from "@/lib/query-keys";
import { formatMoney, formatEventDate } from "@/lib/format";
export function EventReportOrders({
  eventId,
  userId,
  filters,
  page,
  setPage,
  valid,
}: {
  eventId: string;
  userId: string | undefined;
  filters: URLSearchParams;
  page: number;
  setPage: (page: number) => void;
  valid: boolean;
}) {
  const params = new URLSearchParams(filters);
  params.set("page", String(page));
  params.set("limit", "20");
  const query = useQuery({
    queryKey: privateKey("organizer-event-orders", userId, eventId, {
      filters: params.toString(),
    }),
    queryFn: () => getEventOrders(eventId, params),
    enabled: !!userId && valid,
    retry: false,
  });
  if (!valid) return <p>Correct the filters to load orders.</p>;
  return (
    <section>
      <h2>Order ledger</h2>
      <p>
        Dates filter reservation creation time in Asia/Dhaka. Includes unpaid
        and cancelled orders; order totals are not revenue.
      </p>
      <a className="button" href={eventOrdersExportUrl(eventId, filters)}>
        Download filtered orders CSV
      </a>
      <p>
        Exports all matching orders, not only this page. Dates in the CSV are
        labelled UTC.
      </p>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : page > Math.max(1, query.data.meta.totalPages) ? (
        <button className="button" type="button" onClick={() => setPage(1)}>
          Reset unavailable page
        </button>
      ) : (
        <>
          <p>{query.data.meta.total} matching orders</p>
          {!query.data.data.length ? (
            <p>No orders match these filters.</p>
          ) : (
            <DataTable
              caption="Filtered event orders"
              rows={query.data.data}
              rowKey={(order) => order.id}
              columns={[
                { key: "id", label: "Order", cell: (order) => order.id },
                {
                  key: "guest",
                  label: "Attendee",
                  cell: (order) => (
                    <>
                      {order.attendee.displayName}
                      <br />
                      {order.attendee.email}
                    </>
                  ),
                },
                {
                  key: "tier",
                  label: "Tier / quantity",
                  cell: (order) =>
                    `${order.quantity} × ${order.ticketTier.name}`,
                },
                {
                  key: "status",
                  label: "Status",
                  cell: (order) => <StatusBadge status={order.status} />,
                },
                {
                  key: "amount",
                  label: "Order total (BDT)",
                  cell: (order) => formatMoney(order.totalAmountPaisaSnapshot),
                },
                {
                  key: "date",
                  label: "Reserved (Dhaka)",
                  cell: (order) => formatEventDate(order.createdAt),
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
    </section>
  );
}
