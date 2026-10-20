"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useUrlFilters, QueryFilterForm } from "@/components/url-filters";
import {
  Button,
  Field,
  Select,
  FilterBar,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import { Pagination } from "@/components/ui/interactive";
import { ReadFailure } from "@/components/read-failure";
import { WaitlistControl } from "@/components/waitlist-control";
import { getWaitlists, waitlistFilters } from "@/lib/waitlists-api";
import { privateKey } from "@/lib/query-keys";
import { usePageVisible } from "@/lib/use-page-visible";
import { formatEventDate, formatMoney } from "@/lib/format";
import styles from "@/components/notifications.module.css";
export function WaitlistHistory() {
  const { session } = useAuth();
  const visible = usePageVisible();
  const filters = useUrlFilters(waitlistFilters);
  const params = new URLSearchParams({
    page: String(filters.values.page),
    limit: "20",
  });
  if (filters.values.status) params.set("status", filters.values.status);
  const query = useQuery({
    queryKey: privateKey("waitlists", session?.user.id, "list", {
      query: params.toString(),
    }),
    queryFn: ({ signal }) => getWaitlists(params, signal),
    enabled: session?.user.role === "ATTENDEE" && filters.valid && visible,
    refetchInterval: visible ? 30000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  });
  return (
    <section>
      <div className={styles.header}>
        <div>
          <h1>Your stock alerts</h1>
          <p>
            Get notified if tickets become available. Availability is first
            come, first served.
          </p>
        </div>
        <Link href="/account/profile">Notification preferences →</Link>
      </div>
      <p>
        This is not a reservation or a priority queue. After an alert, you can
        explicitly re-arm when tickets are sold out again and the 60-minute
        cooldown has passed. Alerts may be delayed while the service sleeps.
      </p>
      <QueryFilterForm key={JSON.stringify(filters.values)}>
        <input type="hidden" name="page" value="1" />
        <FilterBar>
          <Field label="Membership status">
            <Select name="status" defaultValue={filters.values.status ?? ""}>
              <option value="">All memberships</option>
              {["WAITING", "NOTIFIED", "LEFT", "FULFILLED", "CLOSED"].map(
                (status) => (
                  <option key={status} value={status}>
                    {status.toLowerCase()}
                  </option>
                ),
              )}
            </Select>
          </Field>
          <Button type="submit">Apply</Button>
        </FilterBar>
      </QueryFilterForm>
      {!filters.valid ? (
        <p role="alert">{filters.error}</p>
      ) : query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ReadFailure
          error={query.error}
          retry={() => void query.refetch()}
          fetching={query.isFetching}
          next="/waitlists"
        />
      ) : filters.values.page > Math.max(1, query.data.meta.totalPages) ? (
        <Button onClick={() => filters.setPage(1)}>
          Reset unavailable page
        </Button>
      ) : (
        <>
          {!query.data.data.length ? (
            <div className={styles.panel}>
              <h2>No memberships in this view</h2>
              <p>
                Join stock alerts from a sold-out ticket tier on an event page.
              </p>
              <Link href="/events">Browse events →</Link>
            </div>
          ) : (
            <ul className={styles.list}>
              {query.data.data.map((row) => (
                <li className={styles.notice} key={row.id}>
                  <StatusBadge status={row.status} />
                  <h2>{row.event.title}</h2>
                  <p>
                    {row.tier.name} · {formatMoney(row.tier.pricePaisa)}
                    <br />
                    {row.event.venue}, {row.event.city}
                    <br />
                    Starts {formatEventDate(row.event.startAt)}
                  </p>
                  <small>
                    Joined {formatEventDate(row.joinedAt)}
                    {row.lastNotifiedAt
                      ? ` · Last alert created ${formatEventDate(row.lastNotifiedAt)}`
                      : ""}
                  </small>
                  <WaitlistControl
                    eventId={row.event.id}
                    tierId={row.tier.id}
                    slug={row.event.slug}
                    saleState={row.saleState}
                    membership={{
                      ...row,
                      eventId: row.event.id,
                      tierId: row.tier.id,
                      entry: row,
                    }}
                  />
                  {row.event.canView && (
                    <Link
                      className="text-link"
                      href={`/events/${row.event.slug}#tier-${row.tier.id}`}
                    >
                      View ticket tier →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={filters.values.page}
            totalPages={query.data.meta.totalPages}
            onPageChange={filters.setPage}
          />
        </>
      )}
    </section>
  );
}
