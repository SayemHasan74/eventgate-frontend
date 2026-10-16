"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useUrlFilters } from "@/components/url-filters";
import { ticketWalletFilterSchema } from "@/lib/filter-schemas";
import { privateKey } from "@/lib/query-keys";
import { getTicketBookings } from "@/lib/ticket-api";
import { formatEventRange } from "@/lib/format";
import { admissionLabels } from "@/lib/ticket-status";
import { EventImage } from "@/components/event-image";
import { ReadFailure } from "@/components/read-failure";
import { Pagination } from "@/components/ui/interactive";
import { FilterBar, Input, Select } from "@/components/ui";
import styles from "./tickets.module.css";
export function TicketWallet() {
  const { session, isReady } = useAuth();
  const filters = useUrlFilters(ticketWalletFilterSchema);
  const { page, period, status = "", search = "" } = filters.values;
  const query = useQuery({
    queryKey: privateKey("tickets", session?.user.id, "bookings", {
      page,
      period,
      status,
      search,
    }),
    queryFn: () =>
      getTicketBookings(
        new URLSearchParams({
          page: String(page),
          limit: "12",
          period,
          ...(status ? { status } : {}),
          ...(search ? { search } : {}),
        }),
      ),
    enabled: isReady && session?.user.role === "ATTENDEE" && filters.valid,
    retry: false,
    refetchOnWindowFocus: true,
  });
  if (!isReady) return <p>Opening your wallet…</p>;
  if (session?.user.role !== "ATTENDEE")
    return (
      <section className={styles.gate}>
        <h1>Attendee access required.</h1>
        <Link className="button" href="/account">
          My account
        </Link>
      </section>
    );
  const groups = query.data?.data ?? [];
  const events = [...new Set(groups.map((group) => group.eventId))];
  return (
    <div className={styles.wallet}>
      <header>
        <p className="eyebrow">
          <span />
          Purchased tickets
        </p>
        <h1>
          Your <b>passes.</b>
        </h1>
        <p>
          Your purchased passes and payment receipts. Refunded bookings are in
          Refunds.
        </p>
      </header>
      <FilterBar>
        <label>
          Search event, tier or city
          <Input
            value={search}
            type="search"
            onChange={(event) => filters.update("search", event.target.value)}
            maxLength={120}
          />
        </label>
        <label>
          Period
          <Select
            value={period}
            onChange={(event) => filters.update("period", event.target.value)}
          >
            <option value="upcoming">Upcoming / ongoing</option>
            <option value="past">Past</option>
            <option value="all">All dates</option>
          </Select>
        </label>
        <label>
          Pass status
          <Select
            value={status}
            onChange={(event) => filters.update("status", event.target.value)}
          >
            <option value="">All statuses</option>
            {["ACTIVE", "CHECKED_IN"].map((value) => (
              <option key={value} value={value}>
                {value === "ACTIVE" ? "Unused" : "Already used"}
              </option>
            ))}
          </Select>
        </label>
      </FilterBar>
      <Link className="text-link" href="/tickets">
        Clear filters
      </Link>
      {!filters.valid ? (
        <p role="alert">{filters.error}</p>
      ) : query.isPending ? (
        <p>Loading booking groups…</p>
      ) : query.isError ? (
        <ReadFailure
          error={query.error}
          retry={() => void query.refetch()}
          fetching={query.isFetching}
          next="/tickets"
        />
      ) : page > Math.max(1, query.data.meta.totalPages) ? (
        <button
          type="button"
          className="button"
          onClick={() => filters.setPage(1)}
        >
          This page no longer exists. Reset to page one
        </button>
      ) : !groups.length ? (
        <section className={styles.empty}>
          <h2>No matching passes.</h2>
          <p>
            Try another filter or browse events to buy tickets. Unpaid
            reservations are in Orders; refunded bookings are in Refunds.
          </p>
          <Link className="button" href="/orders">
            Order history
          </Link>
          <Link className="button button-primary" href="/events">
            Browse events
          </Link>
        </section>
      ) : (
        <>
          <p>{query.data.meta.total} purchased bookings</p>
          {events.map((eventId) => {
            const event = groups.find(
              (group) => group.eventId === eventId,
            )!.event;
            return (
              <section className={styles.bookingEvent} key={eventId}>
                <div className={styles.cover}>
                  <EventImage
                    publicView
                    src={event.imageUrl}
                    title={event.title}
                  />
                </div>
                <h2>{event.title}</h2>
                <p>
                  {formatEventRange(event.startAt, event.endAt)} · {event.venue}
                  , {event.city}
                </p>
                {groups
                  .filter((group) => group.eventId === eventId)
                  .map((group) => (
                    <article className={styles.booking} key={group.orderId}>
                      <h3>
                        {group.tierName} · {group.passCount} issued passes
                      </h3>
                      <p>
                        Booking #{group.orderId.slice(0, 8).toUpperCase()} ·{" "}
                        {Object.entries(group.statusCounts)
                          .map(
                            ([state, count]) =>
                              `${count} ${admissionLabels[state] ?? state}`,
                          )
                          .join(" · ")}
                      </p>
                      <nav
                        className={styles.passLinks}
                        aria-label="Booking passes"
                      >
                        {group.tickets.map((ticket) => (
                          <Link
                            className="button"
                            key={ticket.id}
                            href={`/tickets/${ticket.id}`}
                          >
                            Pass {ticket.sequence} ·{" "}
                            {admissionLabels[ticket.effectiveAdmissionState]}
                          </Link>
                        ))}
                      </nav>
                      <div className={styles.passLinks}>
                        <Link
                          className="button"
                          href={`/orders/${group.orderId}#purchase-receipt`}
                        >
                          View payment receipt
                        </Link>
                        {group.canBuyMore && group.ticketTierId && (
                          <Link
                            className="button button-primary"
                            href={`/events/${group.event.slug}/tickets?tierId=${group.ticketTierId}`}
                          >
                            Buy more tickets
                          </Link>
                        )}
                      </div>
                      {group.canBuyMore && (
                        <p>
                          Additional tickets use a new booking. You pay only for
                          the new quantity.
                        </p>
                      )}
                    </article>
                  ))}
              </section>
            );
          })}
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
