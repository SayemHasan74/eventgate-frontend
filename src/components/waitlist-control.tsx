"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth-provider";
import { Button } from "./ui";
import {
  getWaitlistMembership,
  joinWaitlist,
  leaveWaitlist,
  type WaitlistMembership,
} from "@/lib/waitlists-api";
import { privateKey, invalidateMutation } from "@/lib/query-keys";
import { usePageVisible } from "@/lib/use-page-visible";
import { formatEventDate } from "@/lib/format";
import styles from "./notifications.module.css";
export function WaitlistControl({
  eventId,
  tierId,
  slug,
  saleState,
  membership,
}: {
  eventId: string;
  tierId: string;
  slug: string;
  saleState: string;
  membership?: WaitlistMembership;
}) {
  const { session, isReady } = useAuth();
  const visible = usePageVisible();
  const client = useQueryClient();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: privateKey("waitlist-membership", session?.user.id, tierId, {
      saleState,
    }),
    queryFn: () => getWaitlistMembership(eventId, tierId),
    enabled: isReady && session?.user.role === "ATTENDEE" && visible,
    staleTime: 30000,
    retry: false,
    initialData: membership,
  });
  async function change(leave = false) {
    if (!session || lock.current) return;
    lock.current = true;
    setPending(true);
    setMessage("");
    try {
      if (leave) await leaveWaitlist(eventId, tierId);
      else await joinWaitlist(eventId, tierId);
      await invalidateMutation(client, session.user.id, "waitlist");
      setMessage(
        leave
          ? "You left this waitlist."
          : "Waiting for a future stock alert. No tickets are reserved.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Waitlist could not be updated.",
      );
      await query.refetch();
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  if (!isReady) return <small>Loading stock-alert controls…</small>;
  if (session && session.user.role !== "ATTENDEE")
    return <small>Stock alerts require an attendee account.</small>;
  if (!session)
    return saleState === "SOLD_OUT" ? (
      <div>
        <p>
          Get notified if tickets become available. Availability is first come,
          first served.
        </p>
        <Link
          className="text-link"
          href={`/auth/sign-in?next=${encodeURIComponent(`/events/${slug}#tier-${tierId}`)}`}
        >
          Sign in to join stock alerts →
        </Link>
      </div>
    ) : saleState === "UPCOMING" ? (
      <small>Save this event for a sale-opening reminder.</small>
    ) : null;
  if (query.isPending) return <small>Checking stock-alert eligibility…</small>;
  if (query.isError)
    return (
      <div role="alert">
        <p>{query.error.message}</p>
        <Button
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Retry stock-alert state
        </Button>
      </div>
    );
  const data =
    membership &&
    Date.parse(membership.serverTime) > Date.parse(query.data.serverTime)
      ? membership
      : query.data;
  return (
    <div>
      <p>{data.notice}</p>
      {data.entry && (
        <p>
          Membership: <strong>{data.entry.status.toLowerCase()}</strong>
          {data.entry.status === "NOTIFIED"
            ? " — an alert was created; stock is not held."
            : ""}
        </p>
      )}
      {data.reason && <p>{data.reason}</p>}
      {data.cooldownUntil && data.entry?.status !== "WAITING" && (
        <small>
          Re-arm cooldown ends {formatEventDate(data.cooldownUntil)}.
        </small>
      )}
      <div className={styles.actions}>
        {data.canJoin && (
          <Button disabled={pending} onClick={() => void change()}>
            {pending
              ? "Updating…"
              : data.entry
                ? "Re-arm stock alerts"
                : "Join stock alerts"}
          </Button>
        )}
        {data.canLeave && (
          <Button disabled={pending} onClick={() => void change(true)}>
            {pending ? "Updating…" : "Leave waitlist"}
          </Button>
        )}
        {data.saleState === "OPEN" && (
          <Link
            className="text-link"
            href={`/events/${slug}/tickets?tierId=${tierId}`}
          >
            Check tickets →
          </Link>
        )}
        {data.saleState === "UPCOMING" && (
          <Link className="text-link" href={`/events/${slug}`}>
            Save this event for a reminder →
          </Link>
        )}
      </div>
      <p role="status">{message}</p>
    </div>
  );
}
