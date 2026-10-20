"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useUrlFilters } from "@/components/url-filters";
import { refundListFilterSchema } from "@/lib/filter-schemas";
import { getRefunds } from "@/lib/refund-api";
import { privateKey } from "@/lib/query-keys";
import { formatEventDate, formatMoney } from "@/lib/format";
import { FilterBar, Input, Select } from "@/components/ui";
import { Pagination } from "@/components/ui/interactive";
import { ReadFailure } from "@/components/read-failure";
import styles from "./refunds.module.css";
export function RefundHistory() {
  const { session, isReady } = useAuth();
  const filters = useUrlFilters(refundListFilterSchema);
  const { page, status = "", search = "" } = filters.values;
  const query = useQuery({
    queryKey: privateKey("refunds", session?.user.id, "list", {
      page,
      status,
      search,
    }),
    queryFn: ({ signal }) =>
      getRefunds(
        new URLSearchParams({
          page: String(page),
          limit: "12",
          ...(status ? { status } : {}),
          ...(search ? { search } : {}),
        }),
        signal,
      ),
    enabled: isReady && session?.user.role === "ATTENDEE" && filters.valid,
    retry: false,
    refetchOnWindowFocus: true,
  });
  if (!isReady) return <p>Opening your refund history…</p>;
  if (session?.user.role !== "ATTENDEE")
    return (
      <section className={styles.gate}>
        <h1>Attendee access required.</h1>
        <Link className="button" href="/account">
          My account
        </Link>
      </section>
    );
  return (
    <div className={styles.history}>
      <header>
        <p className="eyebrow">
          <span />
          Persisted refund history
        </p>
        <h1>
          Refund <b>progress.</b>
        </h1>
        <p>
          Attendee requests and automatic cancellation/late-payment refunds
          appear here. Provider confirmation determines completion.
        </p>
      </header>
      <FilterBar>
        <label>
          Search event
          <Input
            value={search}
            type="search"
            maxLength={120}
            onChange={(event) => filters.update("search", event.target.value)}
          />
        </label>
        <label>
          Status
          <Select
            value={status}
            onChange={(event) => filters.update("status", event.target.value)}
          >
            <option value="">All statuses</option>
            {[
              "REQUESTED",
              "APPROVED",
              "REJECTED",
              "PROCESSING",
              "SUCCEEDED",
              "FAILED",
              "UNKNOWN",
            ].map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>
      </FilterBar>
      <Link className="text-link" href="/refunds">
        Clear filters
      </Link>
      {!filters.valid ? (
        <p role="alert">{filters.error}</p>
      ) : query.isPending ? (
        <p>Loading requests…</p>
      ) : query.isError ? (
        <ReadFailure
          error={query.error}
          retry={() => void query.refetch()}
          fetching={query.isFetching}
          next="/refunds"
        />
      ) : page > Math.max(1, query.data.meta.totalPages) ? (
        <button
          className="button"
          type="button"
          onClick={() => filters.setPage(1)}
        >
          Page no longer available. Reset to page one
        </button>
      ) : !query.data.refunds.length ? (
        <section className={styles.empty}>
          <h2>No matching refunds.</h2>
          <p>
            Try another filter or open an eligible paid booking from order
            history.
          </p>
          <Link className="button" href="/orders">
            Order history
          </Link>
        </section>
      ) : (
        <>
          <p>{query.data.total} refund records</p>
          <div className={styles.list}>
            {query.data.refunds.map((refund) => (
              <article key={refund.id}>
                <div>
                  <span className={styles.status}>{refund.status}</span>
                  <h2>{refund.order.eventNameSnapshot}</h2>
                  <p>
                    {refund.reason.replaceAll("_", " ")} · Requested{" "}
                    {formatEventDate(refund.requestedAt)}
                  </p>
                  <p>
                    <Link className="text-link" href={`/refunds/${refund.id}`}>
                      Full timeline →
                    </Link>{" "}
                    ·{" "}
                    <Link
                      className="text-link"
                      href={`/orders/${refund.orderId}`}
                    >
                      Related order →
                    </Link>
                  </p>
                </div>
                <strong>{formatMoney(refund.amountPaisa)}</strong>
              </article>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={query.data.meta.totalPages}
            onPageChange={filters.setPage}
          />
        </>
      )}
    </div>
  );
}
