"use client";
import Form from "next/form";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useUrlFilters, DebouncedSearchInput } from "@/components/url-filters";
import { EmptyState } from "@/components/empty-state";
import {
  FilterBar,
  Input,
  Select,
  Skeleton,
  MetricCard,
  LinkButton,
  StatusBadge,
} from "@/components/ui";
import { ErrorState, Pagination } from "@/components/ui/interactive";
import { managedEventFilterSchema } from "@/lib/filter-schemas";
import { privateKey } from "@/lib/query-keys";
import { dhakaDayBounds, formatEventRange } from "@/lib/format";
import { getManagedEvents, getOrganizerOverview } from "@/lib/organizer-api";
import shell from "@/components/workspace.module.css";
import styles from "./organizer.module.css";
type EventSummary = Awaited<
  ReturnType<typeof getOrganizerOverview>
>["recentEvents"][number];
function EventCards({ events }: { events: EventSummary[] }) {
  return (
    <div className={styles.eventList}>
      {events.map((event) => (
        <Link
          className={styles.eventCard}
          key={event.id}
          href={`/organizer/events/${event.id}`}
        >
          <div>
            <StatusBadge status={event.status} />
            <h3>{event.title}</h3>
            <p>{formatEventRange(event.startAt, event.endAt)}</p>
            <p>
              {event.venue}, {event.city}
            </p>
          </div>
          <span aria-hidden="true">→</span>
        </Link>
      ))}
    </div>
  );
}
function OrganizerOverview() {
  const { session } = useAuth();
  const query = useQuery({
    queryKey: privateKey("organizer-overview", session?.user.id, "summary", {}),
    queryFn: getOrganizerOverview,
    enabled: !!session,
  });
  return (
    <div className={styles.dashboard}>
      <header className={styles.hero}>
        <div>
          <h1>Organizer overview</h1>
          <p>
            {session?.user.role === "ADMIN"
              ? "A summary of all managed events."
              : "Your upcoming programme, drafts needing attention, and confirmed activity."}
          </p>
        </div>
        <LinkButton variant="primary" href="/organizer/events/new">
          Create event
        </LinkButton>
      </header>
      <div className={styles.quickLinks}>
        <LinkButton href="/organizer/events">Full event catalogue</LinkButton>
        <LinkButton href="/organizer/events?status=DRAFT">
          All drafts
        </LinkButton>
        <LinkButton href="/organizer/events?status=COMPLETED">
          Completed events
        </LinkButton>
        <LinkButton href="/organizer/events?status=CANCELLED">
          Cancelled events
        </LinkButton>
      </div>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        <>
          <div className={shell.metrics}>
            <MetricCard
              label="All managed events"
              value={Object.values(query.data.eventsByStatus).reduce(
                (sum, value) => sum + value,
                0,
              )}
            />
            <MetricCard
              label="Published"
              value={query.data.eventsByStatus.PUBLISHED ?? 0}
            />
            <MetricCard
              label="Drafts"
              value={query.data.eventsByStatus.DRAFT ?? 0}
            />
            <MetricCard label="Paid orders" value={query.data.paidOrders} />
            <MetricCard
              label="Active tickets"
              value={query.data.activeTickets}
            />
          </div>
          <section className={styles.events}>
            <h2>Upcoming published events</h2>
            <p className={styles.muted}>
              The next five events, ordered by start time.
            </p>
            {query.data.upcomingEvents.length ? (
              <EventCards events={query.data.upcomingEvents} />
            ) : (
              <EmptyState
                title="No upcoming published events."
                description="Finish a draft and review publication to open ticket sales."
                action={
                  <LinkButton href="/organizer/events?status=DRAFT">
                    Find a draft
                  </LinkButton>
                }
              />
            )}
          </section>
          <section className={styles.events}>
            <h2>Drafts needing work</h2>
            <p className={styles.muted}>
              Your five most recently updated drafts. Open an overview to follow
              its setup checklist.
            </p>
            {query.data.draftEvents.length ? (
              <EventCards events={query.data.draftEvents} />
            ) : (
              <EmptyState
                title="No drafts waiting."
                description="Create a new event to start your next programme."
                action={
                  <LinkButton href="/organizer/events/new">
                    Create event
                  </LinkButton>
                }
              />
            )}
          </section>
          <section className={styles.events}>
            <h2>Recently updated</h2>
            {query.data.recentEvents.length ? (
              <EventCards events={query.data.recentEvents} />
            ) : (
              <p>No event activity yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
function EventCatalogue() {
  const { session } = useAuth();
  const filters = useUrlFilters(managedEventFilterSchema);
  const { page, search = "", status = "", startDate, endDate } = filters.values;
  const query = useQuery({
    queryKey: privateKey(
      "organizer-events",
      session?.user.id,
      "list",
      filters.values,
    ),
    queryFn: ({ signal }) =>
      getManagedEvents(
        new URLSearchParams({
          page: String(page),
          limit: "20",
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
          ...(startDate ? { startAfter: dhakaDayBounds(startDate).start } : {}),
          ...(endDate ? { startBefore: dhakaDayBounds(endDate).end } : {}),
        }),
        signal,
      ),
    enabled: !!session && filters.valid,
  });
  return (
    <div className={styles.dashboard}>
      <header className={styles.hero}>
        <div>
          <h1>Event catalogue</h1>
          <p>
            Search across every lifecycle state. Dates filter event starts in
            Bangladesh time.
          </p>
        </div>
        <LinkButton variant="primary" href="/organizer/events/new">
          Create event
        </LinkButton>
      </header>
      <FilterBar>
        <Form scroll={false} action="/organizer/events">
          <input type="hidden" name="page" value="1" />
          <label>
            Search events
            <DebouncedSearchInput
              styled
              name="search"
              defaultValue={search}
              maxLength={120}
            />
          </label>
          <label>
            Status
            <Select key={status} name="status" defaultValue={status}>
              <option value="">All states</option>
              {["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"].map((state) => (
                <option key={state}>{state}</option>
              ))}
            </Select>
          </label>
          <label>
            From (Bangladesh date)
            <Input
              key={startDate ?? "from"}
              name="startDate"
              type="date"
              defaultValue={startDate}
            />
          </label>
          <label>
            Through (Bangladesh date)
            <Input
              key={endDate ?? "through"}
              name="endDate"
              type="date"
              defaultValue={endDate}
            />
          </label>
          <button className="button" type="submit">
            Apply filters
          </button>
          <Link href="/organizer/events">Clear filters</Link>
        </Form>
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
      ) : (
        <>
          <p>{query.data.meta.total} matching events</p>
          {query.data.data.length ? (
            <EventCards
              events={query.data.data.map((event) => ({
                ...event,
                deletedAt: null,
              }))}
            />
          ) : (
            <EmptyState
              title="No matching events."
              description="Clear filters or create your first draft."
              action={
                <LinkButton href="/organizer/events/new">
                  Create event
                </LinkButton>
              }
            />
          )}
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
export function OrganizerDashboard({
  catalogue = false,
}: {
  catalogue?: boolean;
}) {
  return catalogue ? <EventCatalogue /> : <OrganizerOverview />;
}
