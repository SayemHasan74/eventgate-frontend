"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { EventTicket } from "@/components/event-ticket";
import { EventImage } from "@/components/event-image";
import {
  Button,
  DataTable,
  LinkButton,
  MetricCard,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import { ErrorState, Pagination } from "@/components/ui/interactive";
import {
  getManagedEvent,
  getManagedTiers,
  getEventReport,
} from "@/lib/organizer-api";
import { privateKey } from "@/lib/query-keys";
import { formatMoney, formatEventDate, formatEventRange } from "@/lib/format";
import { EventForm } from "../new/event-form";
import { EventLifecycleActions } from "./event-lifecycle-actions";
import shell from "@/components/workspace.module.css";
import styles from "./event-workspace.module.css";
export function EventWorkspace({
  details = false,
  preview = false,
}: {
  details?: boolean;
  preview?: boolean;
}) {
  const { eventId } = useParams<{ eventId: string }>();
  const { session } = useAuth();
  const [tierPage, setTierPage] = useState(1);
  const query = useQuery({
    queryKey: privateKey("organizer-events", session?.user.id, eventId, {}),
    queryFn: () => getManagedEvent(eventId),
    enabled: !!session,
    refetchInterval: (query) => {
      const event = query.state.data;
      if (event?.status !== "CANCELLED") return false;
      return ["PENDING", "RUNNING"].includes(
        event.cancellationState.dispatchStatus ?? "",
      ) ||
        Object.entries(event.cancellationState.refundsByStatus).some(
          ([status, count]) =>
            count > 0 &&
            ["REQUESTED", "APPROVED", "PROCESSING"].includes(status),
        )
        ? 10000
        : false;
    },
    refetchIntervalInBackground: false,
  });
  const report = useQuery({
    queryKey: privateKey("organizer-reports", session?.user.id, eventId, {
      view: "statistics",
    }),
    queryFn: () => getEventReport(eventId),
    enabled: !!session && !details && !preview,
    refetchInterval:
      query.data?.status === "CANCELLED" &&
      (["PENDING", "RUNNING"].includes(
        query.data.cancellationState.dispatchStatus ?? "",
      ) ||
        Object.entries(query.data.cancellationState.refundsByStatus).some(
          ([status, count]) =>
            count > 0 &&
            ["REQUESTED", "APPROVED", "PROCESSING"].includes(status),
        ))
        ? 10000
        : false,
    refetchIntervalInBackground: false,
  });
  const tiers = useQuery({
    queryKey: privateKey("organizer-tiers", session?.user.id, eventId, {
      page: tierPage,
    }),
    queryFn: () =>
      getManagedTiers(
        eventId,
        new URLSearchParams({ page: String(tierPage), limit: "20" }),
      ),
    enabled: !!session && preview,
  });
  if (query.isPending) return <Skeleton />;
  if (query.isError)
    return (
      <ErrorState
        title="Event unavailable"
        message={query.error.message}
        retry={() => void query.refetch()}
      />
    );
  const event = query.data;
  const base = `/organizer/events/${eventId}`;
  if (details && event.capabilities.editable)
    return <EventForm key={event.id} initialEvent={event} />;
  if (details || preview)
    return (
      <section className={styles.page}>
        <div className={styles.notice}>
          {preview
            ? "Private preview — this uses authenticated managed data. Drafts are not available on the public website, and this screen does not sell tickets."
            : "Historical event — details are read-only. Orders, admission history, and reports remain available."}
        </div>
        <header>
          <StatusBadge status={event.status} />
          <h1>{event.title}</h1>
          <p>{event.category}</p>
        </header>
        <div className={styles.grid}>
          <section className={styles.panel}>
            <EventImage src={event.imageUrl} title={event.title} />
            <h2>About this event</h2>
            <p>{event.description}</p>
          </section>
          <section className={styles.panel}>
            <h2>Date and location</h2>
            <dl className={styles.facts}>
              <dt>Schedule</dt>
              <dd>{formatEventRange(event.startAt, event.endAt)}</dd>
              <dt>Venue</dt>
              <dd>{event.venue}</dd>
              <dt>Address</dt>
              <dd>
                {event.address}, {event.city}
              </dd>
              <dt>Public URL</dt>
              <dd>/events/{event.slug}</dd>
            </dl>
            <LinkButton href={base}>Back to event overview</LinkButton>
          </section>
        </div>
        {preview && (
          <section id="inventory" className={styles.panel}>
            <h2>Saved ticket tiers</h2>
            {tiers.isPending ? (
              <Skeleton />
            ) : tiers.isError ? (
              <ErrorState
                message={tiers.error.message}
                retry={() => void tiers.refetch()}
              />
            ) : !tiers.data.data.length ? (
              <p>No saved tiers yet. Add inventory before publishing.</p>
            ) : (
              <>
                <DataTable
                  caption="Private ticket inventory preview"
                  rows={tiers.data.data}
                  rowKey={(tier) => tier.id}
                  columns={[
                    { key: "name", label: "Tier", cell: (tier) => tier.name },
                    {
                      key: "price",
                      label: "Price",
                      cell: (tier) => formatMoney(tier.pricePaisa),
                    },
                    {
                      key: "capacity",
                      label: "Capacity",
                      cell: (tier) => tier.capacity,
                    },
                    {
                      key: "available",
                      label: "Available",
                      cell: (tier) => tier.availableQuantity ?? "Unavailable",
                    },
                    {
                      key: "window",
                      label: "Sales window",
                      cell: (tier) =>
                        formatEventRange(tier.salesStartAt, tier.salesEndAt),
                    },
                  ]}
                />
                <Pagination
                  page={tierPage}
                  totalPages={tiers.data.meta.totalPages}
                  onPageChange={setTierPage}
                />
              </>
            )}
          </section>
        )}
        <div className={styles.actions}>
          <LinkButton href={base + "/orders"}>Order history</LinkButton>
          <LinkButton href={base + "/reports"}>Historical reports</LinkButton>
          {event.capabilities.editable && (
            <LinkButton href={base + "/details"}>Edit details</LinkButton>
          )}
        </div>
      </section>
    );
  const inventory = report.data?.tiers.reduce(
    (sum, tier) => ({
      capacity: sum.capacity + tier.currentCapacity,
      sold: sum.sold + tier.currentSold,
      reserved: sum.reserved + tier.currentReserved,
    }),
    { capacity: 0, sold: 0, reserved: 0 },
  );
  const checks = [
    {
      label: "Event starts in the future",
      complete: event.setupChecks.futureStart,
      href: base + "/details",
    },
    {
      label: "End follows start",
      complete: event.setupChecks.validDates,
      href: base + "/details",
    },
    {
      label: "Required details saved",
      complete: !!(
        event.title &&
        event.description &&
        event.category &&
        event.venue &&
        event.city &&
        event.address
      ),
      href: base + "/details",
    },
    {
      label: "Eligible unpaused saved tier",
      complete: event.setupChecks.hasActiveTier,
      href: base + "/tickets",
    },
  ];
  return (
    <section className={styles.page}>
      <EventTicket
        event={event}
        actions={
          <>
            {event.capabilities.editable && (
              <LinkButton href={base + "/details"}>Edit event</LinkButton>
            )}
            <LinkButton href={base + "/tickets"}>
              {event.status === "DRAFT" ? "Add tier" : "Manage tiers"}
            </LinkButton>
            <EventLifecycleActions event={event} />
          </>
        }
      >
        <p className={styles.gateStatus}>
          {event.checkInWindow.isOpen ? "● Gate open" : "○ Gate closed"}
        </p>
        <p>
          {formatEventRange(
            event.checkInWindow.opensAt,
            event.checkInWindow.closesAt,
          )}
        </p>
        <LinkButton variant="primary" href={base + "/check-in"}>
          Open check-in desk →
        </LinkButton>
        <p>
          Scan an attendee’s purchased QR at the desk. One successful admission
          per pass.
        </p>
        <LinkButton href={base + "/preview"}>Private preview</LinkButton>
        {event.status !== "DRAFT" && (
          <LinkButton href={`/events/${event.slug}`}>Public event</LinkButton>
        )}
        <Button
          disabled={query.isFetching}
          onClick={() => void Promise.all([query.refetch(), report.refetch()])}
        >
          Refresh status
        </Button>
      </EventTicket>
      {(event.status === "CANCELLED" || event.status === "COMPLETED") && (
        <div className={styles.notice}>
          This event is historical and cannot be edited. Orders and reports are
          retained; cancellation refund processing is tracked separately below.
        </div>
      )}
      <section className={styles.panel}>
        <h2>Sales and admission</h2>
        {report.isPending ? (
          <Skeleton />
        ) : report.isError ? (
          <ErrorState
            message={report.error.message}
            retry={() => void report.refetch()}
          />
        ) : (
          <div className={`${shell.metrics} ${styles.metrics}`}>
            <MetricCard
              label="Net ticket sales"
              value={formatMoney(report.data.netTicketSalesPaisa)}
            />
            <MetricCard
              label="Fulfilled purchases (historical)"
              value={report.data.fulfilledPurchaseCount}
            />
            <MetricCard
              label="Checked in"
              value={report.data.checkedInPasses}
            />
            <MetricCard label="Capacity" value={inventory?.capacity ?? 0} />
            <MetricCard label="Sold" value={inventory?.sold ?? 0} />
            <MetricCard label="Reserved" value={inventory?.reserved ?? 0} />
            <MetricCard
              label="Available inventory"
              value={Math.max(
                0,
                (inventory?.capacity ?? 0) -
                  (inventory?.sold ?? 0) -
                  (inventory?.reserved ?? 0),
              )}
            />
          </div>
        )}
        <p>
          {event._count.orders} total orders · {event._count.ticketTiers} active
          tiers. Sold/reserved inventory is not a promise that admission or
          refund eligibility is active.
        </p>
      </section>
      <div className={styles.grid}>
        {event.status === "DRAFT" ? (
          <section className={styles.panel}>
            <h2>Basic setup checklist</h2>
            <ul className={styles.checks}>
              {checks.map((check) => (
                <li key={check.label}>
                  <span>
                    {check.complete ? "✓" : "○"} {check.label}
                  </span>
                  {!check.complete && <Link href={check.href}>Resolve</Link>}
                </li>
              ))}
            </ul>
            <p>
              Open publication review to inspect the saved event and inventory
              before publishing.
            </p>
            <LinkButton variant="primary" href={base + "/publish"}>
              Review publication
            </LinkButton>
          </section>
        ) : (
          <section className={styles.panel}>
            <h2>Admission window</h2>
            <p>
              {event.interestedCount} active stock-alert memberships. These are
              interest counts, not reserved tickets; attendee contacts are not
              exposed.
            </p>
            <p>
              {formatEventRange(
                event.checkInWindow.opensAt,
                event.checkInWindow.closesAt,
              )}
            </p>
            <p>
              {event.checkInWindow.isOpen
                ? "The backend currently permits check-in."
                : "Check-in is not currently open."}
            </p>
            {event.status === "PUBLISHED" && (
              <LinkButton href={base + "/check-in"}>
                Open check-in desk
              </LinkButton>
            )}
          </section>
        )}
        <section className={styles.panel}>
          <h2>Event tools</h2>
          <div className={styles.actions}>
            {event.capabilities.editable && (
              <LinkButton href={base + "/details"}>Edit details</LinkButton>
            )}
            <LinkButton href={base + "/tickets"}>
              {event.capabilities.canManageTiers
                ? "Manage tiers"
                : "View inventory"}
            </LinkButton>
            <LinkButton href={base + "/orders"}>Review orders</LinkButton>
            <LinkButton href={base + "/reports"}>Open reports</LinkButton>
          </div>

          {event.status === "DRAFT" && !event.capabilities.canDelete && (
            <p>This draft has order history and cannot be deleted.</p>
          )}
        </section>
      </div>
      {event.status === "CANCELLED" && (
        <section className={styles.panel}>
          <h2>Cancellation and refunds</h2>
          <p>
            Cancelled{" "}
            {event.cancellationState.cancelledAt
              ? formatEventDate(event.cancellationState.cancelledAt)
              : "—"}
          </p>
          <p>
            Refund dispatch:{" "}
            <strong>
              {event.cancellationState.dispatchStatus ?? "Awaiting dispatcher"}
            </strong>
            {event.cancellationState.dispatchCompletedAt
              ? ` · completed ${formatEventDate(event.cancellationState.dispatchCompletedAt)}`
              : ""}
          </p>
          {event.cancellationState.dispatchStatus === "FAILED" && (
            <p role="alert">
              The dispatcher failed. An administrator must inspect operations;
              do not assume refunds were issued.
            </p>
          )}
          <dl className={styles.facts}>
            {Object.entries(event.cancellationState.refundsByStatus).map(
              ([status, count]) => (
                <div key={status}>
                  <dt>{status.replaceAll("_", " ")}</dt>
                  <dd>{count}</dd>
                </div>
              ),
            )}
          </dl>
          {!Object.keys(event.cancellationState.refundsByStatus).length && (
            <p>No refund records are recorded yet.</p>
          )}
          <p>
            Dispatcher success means eligible refunds were queued, not that the
            provider returned all money. UNKNOWN/FAILED refunds need
            administrator review.
          </p>
          <p>
            {event.cancellationImpact.paidOrders} orders still have paid status.
          </p>
          <LinkButton href={base + "/orders"}>
            Inspect affected orders
          </LinkButton>
        </section>
      )}
    </section>
  );
}
