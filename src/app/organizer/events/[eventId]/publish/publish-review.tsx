"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { EventImage } from "@/components/event-image";
import {
  Button,
  FieldError,
  LinkButton,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import { ErrorState } from "@/components/ui/interactive";
import { getManagedEvent, publishManagedEvent } from "@/lib/organizer-api";
import { ApiError } from "@/lib/api-error";
import { privateKey, invalidateMutation } from "@/lib/query-keys";
import { formatEventRange, formatMoney } from "@/lib/format";
import styles from "../event-workspace.module.css";
export function PublishReview() {
  const { session } = useAuth();
  const { eventId } = useParams<{ eventId: string }>();
  const client = useQueryClient();
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: privateKey("organizer-events", session?.user.id, eventId, {}),
    queryFn: () => getManagedEvent(eventId),
    enabled: !!session,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });
  const publish = async () => {
    if (!session || !confirmed || !query.data?.publicationReadiness.ready)
      return;
    setPending(true);
    setError("");
    try {
      await publishManagedEvent(eventId);
      await invalidateMutation(client, session.user.id, "event");
      toast.success("Event published.");
      router.push(`/organizer/events/${eventId}`);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof ApiError
          ? [error.message, ...error.errors.map((item) => item.message)].join(
              " ",
            )
          : error instanceof Error
            ? error.message
            : "Publication failed. Your draft is retained.",
      );
      await query.refetch();
    } finally {
      setPending(false);
    }
  };
  if (query.isPending) return <Skeleton />;
  if (query.isError)
    return (
      <ErrorState
        message={query.error.message}
        retry={() => void query.refetch()}
      />
    );
  const event = query.data;
  if (event.status !== "DRAFT")
    return (
      <section className={styles.panel}>
        <h1>
          {event.status === "PUBLISHED"
            ? "Event already published"
            : "Historical event"}
        </h1>
        <p>This event cannot be published from its current state.</p>
        <LinkButton href={`/organizer/events/${eventId}`}>
          Return to event overview
        </LinkButton>
      </section>
    );
  return (
    <section className={styles.page}>
      <header>
        <h1>Publication review</h1>
        <p>
          Review the saved details and all saved tiers. The backend repeats
          these exact readiness checks inside the publication transaction.
        </p>
      </header>
      <div className={styles.grid}>
        <section className={styles.panel}>
          <EventImage src={event.imageUrl} title={event.title} />
          <h2>{event.title}</h2>
          <p>{event.description}</p>
          <p>
            {event.category} · {event.venue}, {event.address}, {event.city}
          </p>
          <p>{formatEventRange(event.startAt, event.endAt)}</p>
          <LinkButton href={`/organizer/events/${eventId}/details`}>
            Correct event details
          </LinkButton>
        </section>
        <section className={styles.panel}>
          <h2>
            {event.publicationReadiness.ready
              ? "Ready for publication"
              : "Resolve these blockers"}
          </h2>
          {event.publicationReadiness.blockers.length ? (
            <ul>
              {event.publicationReadiness.blockers.map((blocker, index) => (
                <li key={blocker.code + index}>{blocker.message}</li>
              ))}
            </ul>
          ) : (
            <p>
              The event and at least one eligible tier meet the publication
              rules. Sales may begin in the future.
            </p>
          )}
          <Button
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            Recheck readiness
          </Button>
        </section>
      </div>
      <section className={styles.panel}>
        <h2>Saved tier readiness</h2>
        {event.publicationReadiness.tiers.length ? (
          <ul className={styles.checks}>
            {event.publicationReadiness.tiers.map((tier) => (
              <li key={tier.id}>
                <div>
                  <strong>{tier.name}</strong>
                  <p>
                    {formatMoney(tier.pricePaisa)} · Capacity {tier.capacity} ·
                    Reserved {tier.reservedQuantity} · Sold {tier.soldQuantity}{" "}
                    · Available {tier.availableQuantity}
                  </p>
                  <p>{formatEventRange(tier.salesStartAt, tier.salesEndAt)}</p>
                  <StatusBadge status={tier.eligible ? "READY" : "BLOCKED"} />
                  {tier.reasons.map((reason) => (
                    <p key={reason}>{reason}</p>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No saved active tiers.</p>
        )}
        <LinkButton href={`/organizer/events/${eventId}/tickets`}>
          Manage saved inventory
        </LinkButton>
      </section>
      <section className={styles.panel}>
        <h2>Publication policy</h2>
        <p>
          Publication makes the event public. Dates, venue, category, tier name,
          tier price and sales start are locked after publication. Capacity can
          only increase. Existing order and admission history is retained.
        </p>
        <p>
          Pause a future sales window; close an already-open window using the
          dedicated sales action. Cancellation voids admission and queues
          eligible provider refunds, not instant repayment.
        </p>
        <label>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />{" "}
          I have reviewed the saved details, saved tiers and publication policy.
        </label>
        <FieldError>{error}</FieldError>
        <div className={styles.actions}>
          <LinkButton href={`/organizer/events/${eventId}`}>
            Back to overview
          </LinkButton>
          <Button
            variant="primary"
            disabled={
              !confirmed ||
              pending ||
              query.isFetching ||
              !event.publicationReadiness.ready
            }
            onClick={() => void publish()}
          >
            {pending ? "Publishing…" : "Publish event"}
          </Button>
        </div>
      </section>
    </section>
  );
}
