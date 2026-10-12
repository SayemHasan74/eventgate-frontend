"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useUrlFilters } from "@/components/url-filters";
import { EventReportFilters } from "@/components/event-report-filters";
import { eventReportFilterSchema } from "@/lib/filter-schemas";
import { getEventInventory, reportParams } from "@/lib/event-report-api";
import { privateKey } from "@/lib/query-keys";
import { EventReportOrders } from "../reports/event-report-orders";
export function EventOrderLedger() {
  const { eventId } = useParams<{ eventId: string }>();
  const { session } = useAuth();
  const filters = useUrlFilters(eventReportFilterSchema);
  const tiers = useQuery({
    queryKey: privateKey("organizer-reports", session?.user.id, eventId, {
      view: "inventory",
      tierId: "",
    }),
    queryFn: () => getEventInventory(eventId),
    enabled: !!session,
    retry: false,
  });
  const params = reportParams(filters.values);
  if (filters.values.search) params.set("search", filters.values.search);
  return (
    <section>
      <h1>Event orders</h1>
      <p>
        Find reservations and purchases by guest, tier, current status or
        reservation date. For canonical revenue and attendance aggregates, use
        Reports.
      </p>
      <EventReportFilters
        values={filters.values}
        tiers={tiers.data?.tiers ?? []}
        search
      />
      <Link href={`/organizer/events/${eventId}/orders`}>Clear filters</Link>
      {tiers.isError && (
        <p role="alert">
          Tier choices could not load. The order ledger can still load
          independently.
        </p>
      )}
      {!filters.valid && <p role="alert">{filters.error}</p>}
      <EventReportOrders
        eventId={eventId}
        userId={session?.user.id}
        filters={params}
        page={filters.values.page}
        setPage={filters.setPage}
        valid={filters.valid}
      />
    </section>
  );
}
