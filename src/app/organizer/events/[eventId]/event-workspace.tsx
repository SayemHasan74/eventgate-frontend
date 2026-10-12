"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { LinkButton, MetricCard, Skeleton, StatusBadge } from "@/components/ui";
import { ErrorState } from "@/components/ui/interactive";
import { getManagedEvent } from "@/lib/organizer-api";
import { privateKey } from "@/lib/query-keys";
import { formatEventDate } from "@/lib/format";
import styles from "@/components/workspace.module.css";
export function EventWorkspace({ details = false }: { details?: boolean }) {
  const { eventId } = useParams<{ eventId: string }>();
  const { session } = useAuth();
  const query = useQuery({
    queryKey: privateKey("organizer-events", session?.user.id, eventId, {}),
    queryFn: () => getManagedEvent(eventId),
    enabled: !!session,
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
  if (details)
    return (
      <section className={styles.panel}>
        <h1>Event details</h1>
        <h2>{event.title}</h2>
        <p>{event.description}</p>
        <dl>
          <dt>Venue</dt>
          <dd>
            {event.venue} · {event.address}, {event.city}
          </dd>
          <dt>Category</dt>
          <dd>{event.category}</dd>
          <dt>Starts</dt>
          <dd>{formatEventDate(event.startAt)}</dd>
          <dt>Ends</dt>
          <dd>{formatEventDate(event.endAt)}</dd>
          <dt>Public address</dt>
          <dd>/events/{event.slug}</dd>
        </dl>
      </section>
    );
  return (
    <section>
      <StatusBadge status={event.status} />
      <h1>{event.title}</h1>
      <p>
        {event.venue}, {event.city} · {formatEventDate(event.startAt)}
      </p>
      <div className={styles.metrics}>
        <MetricCard label="Orders" value={event._count.orders} />
        <MetricCard
          label="Active ticket tiers"
          value={event._count.ticketTiers}
        />
      </div>
      <div className={styles.panel}>
        <h2>Next actions</h2>
        {event.capabilities.canManageTiers && (
          <LinkButton href={`/organizer/events/${eventId}/tickets`}>
            Manage ticket tiers
          </LinkButton>
        )}
        {event.capabilities.canPublish && (
          <LinkButton
            href={`/organizer/events/${eventId}/publish`}
            variant="primary"
          >
            Review publication
          </LinkButton>
        )}
        {event.status === "PUBLISHED" && (
          <LinkButton href={`/events/${event.slug}`}>
            View public event
          </LinkButton>
        )}
        <LinkButton href={`/organizer/events/${eventId}/orders`}>
          Review event orders
        </LinkButton>
        <LinkButton href={`/organizer/events/${eventId}/reports`}>
          Open reports
        </LinkButton>
      </div>
    </section>
  );
}
