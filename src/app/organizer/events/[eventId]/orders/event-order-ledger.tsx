"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { DataTable, Skeleton, StatusBadge } from "@/components/ui";
import { ErrorState, Pagination } from "@/components/ui/interactive";
import { EmptyState } from "@/components/empty-state";
import { getEventOrders } from "@/lib/organizer-api";
import { privateKey } from "@/lib/query-keys";
import { formatCurrency, formatEventDate } from "@/lib/format";
export function EventOrderLedger() {
  const { eventId } = useParams<{ eventId: string }>();
  const { session } = useAuth();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: privateKey("organizer-event-orders", session?.user.id, eventId, {
      page,
    }),
    queryFn: () =>
      getEventOrders(
        eventId,
        new URLSearchParams({ page: String(page), limit: "20" }),
      ),
    enabled: !!session,
  });
  return (
    <section>
      <h1>Event orders</h1>
      <p>
        Booking history for this event, including unpaid and cancelled orders.
      </p>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : !query.data.data.length ? (
        <EmptyState
          title="No orders yet."
          description="Bookings will appear here when an attendee reserves tickets."
        />
      ) : (
        <>
          <DataTable
            caption="Event bookings"
            rows={query.data.data}
            rowKey={(order) => order.id}
            columns={[
              {
                key: "attendee",
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
                key: "status",
                label: "Status",
                cell: (order) => <StatusBadge status={order.status} />,
              },
              {
                key: "tier",
                label: "Tickets",
                cell: (order) => `${order.quantity} × ${order.ticketTier.name}`,
              },
              {
                key: "amount",
                label: "Total",
                cell: (order) => formatCurrency(order.totalAmountPaisaSnapshot),
              },
              {
                key: "created",
                label: "Reserved",
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
