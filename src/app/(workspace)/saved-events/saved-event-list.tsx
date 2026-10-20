"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  getSavedEvents,
  savedFilters,
  saveEvent,
  removeSavedEvent,
  reminderChoices,
  type ReminderChoices,
  type SavedEventRow,
} from "@/lib/saved-events-api";
import { privateKey, invalidateMutation } from "@/lib/query-keys";
import { usePageVisible } from "@/lib/use-page-visible";
import { formatEventRange, formatMoney } from "@/lib/format";
import styles from "./saved-events.module.css";
import { WaitlistControl } from "@/components/waitlist-control";
function SavedCard({
  row,
  onChanged,
}: {
  row: SavedEventRow;
  onChanged: () => Promise<unknown>;
}) {
  const form = useForm<ReminderChoices>({
    resolver: zodResolver(reminderChoices),
    defaultValues: reminderChoices.parse(row),
  });
  const lock = useRef(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState("");
  const event = row.event;
  const upcoming =
    event.canView && Date.parse(event.startAt) > Date.parse(row.serverTime);
  async function save(values: ReminderChoices) {
    if (lock.current) return;
    lock.current = true;
    setMessage("");
    try {
      const result = await saveEvent(row.eventId, values);
      if (result.saved) form.reset(reminderChoices.parse(result.saved));
      await onChanged();
      setMessage("Reminder choices saved.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Reminder choices were not saved.",
      );
    } finally {
      lock.current = false;
    }
  }
  async function remove() {
    if (lock.current) return;
    lock.current = true;
    setRemoving(true);
    setMessage("");
    try {
      await removeSavedEvent(row.eventId);
      await onChanged();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Event could not be removed.",
      );
    } finally {
      lock.current = false;
      setRemoving(false);
    }
  }
  return (
    <li className={styles.card}>
      <div className={styles.heading}>
        <div>
          <StatusBadge
            status={event.deletedAt ? "UNAVAILABLE" : event.status}
          />
          <h2>{event.title}</h2>
          <p>{formatEventRange(event.startAt, event.endAt)}</p>
          <p>
            {event.venue}, {event.city}
          </p>
        </div>
        <Button
          variant="ghost"
          disabled={removing || form.formState.isSubmitting}
          onClick={() => void remove()}
          aria-label={`Remove ${event.title} from saved events`}
        >
          {removing ? "Removing…" : "Remove saved event"}
        </Button>
      </div>
      <div className={styles.tiers}>
        {event.ticketTiers.map((tier) => (
          <div key={tier.id}>
            <strong>
              {tier.name} · {formatMoney(tier.pricePaisa)}
            </strong>
            <span>
              {tier.saleState.replaceAll("_", " ").toLowerCase()} ·{" "}
              {tier.availableQuantity} available
            </span>
            <WaitlistControl
              eventId={event.id}
              tierId={tier.id}
              slug={event.slug}
              saleState={tier.saleState}
            />
            {tier.saleState === "UPCOMING" && (
              <small>
                Window: {formatEventRange(tier.salesStartAt, tier.salesEndAt)}
              </small>
            )}
          </div>
        ))}
      </div>
      {!upcoming ? (
        <p>
          This event is no longer upcoming and available. Kept in your saved
          history; reminders and purchasing are unavailable.
        </p>
      ) : (
        <form onSubmit={(e) => void form.handleSubmit(save)(e)}>
          <fieldset disabled={removing || form.formState.isSubmitting}>
            <legend>Reminders for this event</legend>
            <label>
              <input
                type="checkbox"
                {...form.register("saleReminderEnabled")}
              />{" "}
              When a ticket window opens
            </label>
            <label>
              <input
                type="checkbox"
                {...form.register("eventReminderEnabled")}
              />{" "}
              24 hours before the event
            </label>
            <Button
              type="submit"
              disabled={!form.formState.isDirty || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? "Saving…"
                : "Save reminder choices"}
            </Button>
          </fieldset>
          <small>
            Only future reminders are scheduled. Your account notification
            preferences also apply.
          </small>
        </form>
      )}
      <p role="status">{message}</p>
      <div className={styles.actions}>
        {event.canView && (
          <Link className="text-link" href={`/events/${event.slug}`}>
            View event details →
          </Link>
        )}
        {event.canBuy && (
          <Link
            className="button button-primary"
            href={`/events/${event.slug}/tickets`}
          >
            Choose tickets →
          </Link>
        )}
      </div>
    </li>
  );
}
export function SavedEventList() {
  const { session } = useAuth();
  const client = useQueryClient();
  const visible = usePageVisible();
  const filters = useUrlFilters(savedFilters);
  const params = new URLSearchParams({
    page: String(filters.values.page),
    limit: "20",
    period: filters.values.period,
  });
  const query = useQuery({
    queryKey: privateKey("saved-events", session?.user.id, "list", {
      query: params.toString(),
    }),
    queryFn: ({ signal }) => getSavedEvents(params, signal),
    enabled: session?.user.role === "ATTENDEE" && filters.valid && visible,
    refetchInterval: visible ? 30000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  });
  return (
    <section>
      <div className={styles.heading}>
        <div>
          <h1>Your saved events</h1>
          <p>
            Your shortlist persists across devices. Saving does not hold stock
            or book tickets.
          </p>
        </div>
        <Link href="/account/profile">Notification preferences →</Link>
      </div>
      <QueryFilterForm key={JSON.stringify(filters.values)}>
        <input type="hidden" name="page" value="1" />
        <FilterBar>
          <Field label="Show">
            <Select name="period" defaultValue={filters.values.period}>
              <option value="all">All saved events</option>
              <option value="upcoming">Upcoming and published</option>
              <option value="past">Past or unavailable</option>
            </Select>
          </Field>
          <Button type="submit">Apply</Button>
        </FilterBar>
      </QueryFilterForm>
      <p>
        Paid bookings have separate 24-hour and 2-hour reminders when valid
        passes remain. Reminders may be delayed while the hosting service is
        asleep.
      </p>
      {!filters.valid ? (
        <p role="alert">{filters.error}</p>
      ) : query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ReadFailure
          error={query.error}
          retry={() => void query.refetch()}
          fetching={query.isFetching}
          next="/saved-events"
        />
      ) : filters.values.page > Math.max(1, query.data.meta.totalPages) ? (
        <Button onClick={() => filters.setPage(1)}>
          Reset unavailable page
        </Button>
      ) : (
        <>
          {!query.data.data.length ? (
            <div className={styles.card}>
              <h2>No saved events in this view</h2>
              <p>Browse events and use the bookmark to build your shortlist.</p>
              <Link href="/events">Browse events →</Link>
            </div>
          ) : (
            <ul className={styles.list}>
              {query.data.data.map((row) => (
                <SavedCard
                  row={row}
                  key={row.id}
                  onChanged={() =>
                    session
                      ? invalidateMutation(client, session.user.id, "save")
                      : Promise.resolve()
                  }
                />
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
