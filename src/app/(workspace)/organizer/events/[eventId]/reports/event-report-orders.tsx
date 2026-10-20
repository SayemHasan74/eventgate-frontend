"use client";
import { useQuery } from "@tanstack/react-query";
import styles from "./order-ledger.module.css";
import { Skeleton } from "@/components/ui";
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
            <div className={styles.shadow}>
              <div className={styles.receipt}>
                <header className={styles.head}>
                  <b>EVENTGATE</b>
                  <span>ORDER LEDGER</span>
                  <small>
                    {query.data.meta.total} matching orders · page {page}
                  </small>
                </header>
                {query.data.data.map((order) => (
                  <article key={order.id} className={styles.line}>
                    <div>
                      <h3>{order.attendee.displayName}</h3>
                      <p>
                        {order.attendee.email} · {order.ticketTier.name} ×{" "}
                        {order.quantity}
                      </p>
                    </div>
                    <div className={styles.amount}>
                      {formatMoney(order.totalAmountPaisaSnapshot)}
                    </div>
                    <div className={styles.bottom}>
                      <span title={order.id}>
                        #{order.id.slice(0, 8)} ·{" "}
                        {formatEventDate(order.createdAt)}
                      </span>
                      <span className={styles.stamp} data-status={order.status}>
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
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
