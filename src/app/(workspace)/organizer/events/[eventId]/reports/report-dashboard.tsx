"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/auth-provider";
import { useUrlFilters } from "@/components/url-filters";
import { EventReportFilters } from "@/components/event-report-filters";
import { DataTable, MetricCard, Skeleton } from "@/components/ui";
import { ErrorState } from "@/components/ui/interactive";
import { getManagedEvent } from "@/lib/organizer-api";
import {
  getEventSales,
  getEventInventory,
  getEventAttendance,
  reportParams,
  type SalesReport,
  type InventoryReport,
} from "@/lib/event-report-api";
import { eventReportFilterSchema } from "@/lib/filter-schemas";
import { privateKey } from "@/lib/query-keys";
import { formatMoney, formatEventDate } from "@/lib/format";
import { EventReportOrders } from "./event-report-orders";
import styles from "./report-dashboard.module.css";
const SalesChart = dynamic(
  () => import("./report-charts").then((module) => module.SalesChart),
  { ssr: false },
);
const InventoryChart = dynamic(
  () => import("./report-charts").then((module) => module.InventoryChart),
  { ssr: false },
);
export function ReportDashboard() {
  const { session, isReady } = useAuth();
  const { eventId } = useParams<{ eventId: string }>();
  const filters = useUrlFilters(eventReportFilterSchema);
  const params = reportParams(filters.values);
  const allowed =
    !!session && ["ORGANIZER", "ADMIN"].includes(session.user.role);
  const event = useQuery({
    queryKey: privateKey("organizer-events", session?.user.id, eventId, {}),
    queryFn: () => getManagedEvent(eventId),
    enabled: isReady && allowed,
    retry: false,
  });
  const enabled = isReady && allowed && filters.valid;
  const inventoryParams = new URLSearchParams(
    filters.values.tierId ? { tierId: filters.values.tierId } : {},
  );
  const choices = useQuery({
    queryKey: privateKey("organizer-reports", session?.user.id, eventId, {
      view: "inventory",
      tierId: "",
    }),
    queryFn: ({ signal }) => getEventInventory(eventId, undefined, signal),
    enabled,
    retry: false,
  });
  const inventory = useQuery({
    queryKey: privateKey("organizer-reports", session?.user.id, eventId, {
      view: "inventory",
      tierId: filters.values.tierId ?? "",
    }),
    queryFn: ({ signal }) =>
      getEventInventory(eventId, inventoryParams, signal),
    enabled,
    retry: false,
  });
  const sales = useQuery({
    queryKey: privateKey("organizer-reports", session?.user.id, eventId, {
      view: "sales",
      filters: params.toString(),
    }),
    queryFn: ({ signal }) => getEventSales(eventId, params, signal),
    enabled,
    retry: false,
  });
  const attendance = useQuery({
    queryKey: privateKey("organizer-reports", session?.user.id, eventId, {
      view: "attendance",
      filters: params.toString(),
    }),
    queryFn: ({ signal }) => getEventAttendance(eventId, params, signal),
    enabled,
    retry: false,
  });
  if (!isReady || (event.isPending && allowed)) return <Skeleton />;
  if (!allowed) return <p>Organizer or administrator access required.</p>;
  if (event.isError)
    return (
      <ErrorState
        message={event.error.message}
        retry={() => void event.refetch()}
      />
    );
  if (!event.data) return <p>Event unavailable.</p>;
  const orderParams = new URLSearchParams(params);
  if (filters.values.search) orderParams.set("search", filters.values.search);
  return (
    <div className={styles.dashboard}>
      <header>
        <p className="eyebrow">Organizer reports</p>
        <h1>{event.data.title}</h1>
        <p>
          Sales, inventory, attendance and orders load independently. Figures
          are server-derived, not estimates from a loaded page.
        </p>
        <Link href={`/organizer/events/${eventId}`}>
          Back to event overview
        </Link>
      </header>
      <EventReportFilters
        values={filters.values}
        tiers={choices.data?.tiers ?? []}
        search
      />
      <Link href={`/organizer/events/${eventId}/reports`}>Clear filters</Link>
      {!filters.valid && <p role="alert">{filters.error}</p>}
      {choices.isError && (
        <p role="alert">
          Tier choices unavailable. Other report panels remain usable.
        </p>
      )}
      {filters.valid && (
        <>
          <section className={styles.panel}>
            <h2>Ticket sales</h2>
            <p>
              Dates select canonical purchase paidAt (Asia/Dhaka). Successful
              booking refunds follow those purchases, even if completed later.
              Current order status and tier filters select the purchase cohort.
            </p>
            {sales.isPending ? (
              <Skeleton />
            ) : sales.isError ? (
              <ErrorState
                message={sales.error.message}
                retry={() => void sales.refetch()}
              />
            ) : (
              <SalesPanel report={sales.data} />
            )}
          </section>
          <section className={styles.panel}>
            <h2>Current inventory and historical passes</h2>
            <p>
              Inventory is current and tier-filtered, not filtered by purchase
              date or order status. Deleted tiers never contribute to current
              capacity; tiers with order history remain visible.
            </p>
            {inventory.isPending ? (
              <Skeleton />
            ) : inventory.isError ? (
              <ErrorState
                message={inventory.error.message}
                retry={() => void inventory.refetch()}
              />
            ) : (
              <InventoryPanel report={inventory.data} />
            )}
          </section>
          <section className={styles.panel}>
            <h2>Admission</h2>
            <p>
              Issued passes are historical; valid unused passes reflect current
              event, payment and refund eligibility. Dates filter actual
              check-in time only. Status and tier select the order cohort.
            </p>
            {attendance.isPending ? (
              <Skeleton />
            ) : attendance.isError ? (
              <ErrorState
                message={attendance.error.message}
                retry={() => void attendance.refetch()}
              />
            ) : (
              <>
                <div className={styles.metrics}>
                  <MetricCard
                    label="Historical issued passes"
                    value={attendance.data.historicalIssuedPasses}
                  />
                  <MetricCard
                    label="Valid unused passes now"
                    value={attendance.data.validUnusedPasses}
                  />
                  <MetricCard
                    label="Recorded check-ins in date range"
                    value={attendance.data.checkedInPasses}
                  />
                </div>
                <p>
                  Updated {formatEventDate(attendance.data.serverTime)}. A
                  downloaded QR does not override server admission.
                </p>
              </>
            )}
          </section>
        </>
      )}
      <div className={styles.panel}>
        <EventReportOrders
          eventId={eventId}
          userId={session?.user.id}
          filters={orderParams}
          page={filters.values.page}
          setPage={filters.setPage}
          valid={enabled}
        />
      </div>
    </div>
  );
}
function SalesPanel({ report }: { report: SalesReport }) {
  const days = report.salesByDay.slice(-60);
  return (
    <>
      <div className={styles.metrics}>
        <MetricCard
          label="Gross ticket sales"
          value={formatMoney(report.grossTicketSalesPaisa)}
        />
        <MetricCard
          label="Successful booking refunds"
          value={formatMoney(report.bookingRefundsPaisa)}
        />
        <MetricCard
          label="Net ticket sales"
          value={formatMoney(report.netTicketSalesPaisa)}
        />
        <MetricCard
          label="Historical fulfilled purchases"
          value={report.fulfilledPurchaseCount}
        />
      </div>
      <p>
        Gross counts each canonical purchase once, including refunded bookings.
        Net = gross − successful canonical booking refunds. Pending refunds and
        gateway fees are not deducted.
      </p>
      <dl className={styles.facts}>
        <dt>Pending canonical booking refunds</dt>
        <dd>{formatMoney(report.pendingBookingRefundsPaisa)}</dd>
        <dt>Non-canonical captures</dt>
        <dd>{formatMoney(report.excessCapturesPaisa)}</dd>
        <dt>Successful non-canonical capture refunds</dt>
        <dd>{formatMoney(report.excessCaptureRefundsPaisa)}</dd>
      </dl>
      <p>
        Non-canonical metrics use capture completedAt dates and are separate
        from ticket revenue.
      </p>
      {!!report.ambiguousPurchaseCount && (
        <p role="alert">
          {report.ambiguousPurchaseCount} historical purchases lack a usable
          canonical identity/date. They are excluded from confirmed sales; ask
          an administrator to investigate.
        </p>
      )}
      {!days.length ? (
        <p>
          No canonical purchases match these filters. No chart data has been
          invented.
        </p>
      ) : (
        <>
          <h3>Sales by purchase day · BDT · Asia/Dhaka</h3>
          <p>
            Chart shows the latest 60 days with actual sales; absent days are
            not interpolated. The table contains all returned sale days.
          </p>
          <div
            className={styles.chart}
            role="img"
            aria-label="Gross sales, booking refunds and net sales by Bangladesh purchase date; exact figures follow in the table."
          >
            <SalesChart days={days} />
          </div>
          <DataTable
            caption="Sales by Bangladesh purchase day"
            rows={report.salesByDay}
            rowKey={(row) => row.day}
            columns={[
              { key: "day", label: "Day (Dhaka)", cell: (row) => row.day },
              {
                key: "gross",
                label: "Gross BDT",
                cell: (row) => formatMoney(row.grossPaisa),
              },
              {
                key: "refund",
                label: "Booking refunds BDT",
                cell: (row) => formatMoney(row.bookingRefundsPaisa),
              },
              {
                key: "net",
                label: "Net BDT",
                cell: (row) => formatMoney(row.netPaisa),
              },
              {
                key: "count",
                label: "Purchases",
                cell: (row) => row.purchases,
              },
            ]}
          />
        </>
      )}
      <p>Updated {formatEventDate(report.serverTime)}</p>
    </>
  );
}
function InventoryPanel({ report }: { report: InventoryReport }) {
  return (
    <>
      <div className={styles.metrics}>
        <MetricCard
          label="Current capacity"
          value={report.summary.currentCapacity}
        />
        <MetricCard
          label="Current sold stock"
          value={report.summary.currentSold}
        />
        <MetricCard
          label="Reserved stock"
          value={report.summary.currentReserved}
        />
        <MetricCard
          label="Available stock"
          value={report.summary.currentAvailable}
        />
      </div>
      {!report.tiers.length ? (
        <p>No inventory or historical tiers match the selection.</p>
      ) : (
        <>
          <div
            className={styles.chart}
            role="img"
            aria-label="Current sold, reserved and available stock by tier; exact values follow in the table."
          >
            <InventoryChart tiers={report.tiers} />
          </div>
          <DataTable
            caption="Current stock versus historical issued passes"
            rows={report.tiers}
            rowKey={(row) => row.id}
            columns={[
              {
                key: "tier",
                label: "Tier",
                cell: (row) =>
                  row.name + (row.deletedAt ? " (historical)" : ""),
              },
              {
                key: "capacity",
                label: "Current capacity",
                cell: (row) => row.currentCapacity,
              },
              {
                key: "sold",
                label: "Current sold",
                cell: (row) => row.currentSold,
              },
              {
                key: "reserved",
                label: "Reserved",
                cell: (row) => row.currentReserved,
              },
              {
                key: "available",
                label: "Available",
                cell: (row) => row.currentAvailable,
              },
              {
                key: "issued",
                label: "Historical issued passes",
                cell: (row) => row.historicalIssuedPasses,
              },
            ]}
          />
        </>
      )}
      <p>Updated {formatEventDate(report.serverTime)}</p>
    </>
  );
}
