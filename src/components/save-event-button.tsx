"use client";
import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth-provider";
import { Button } from "./ui";
import {
  getSavedMembership,
  saveEvent,
  removeSavedEvent,
} from "@/lib/saved-events-api";
import { privateKey, invalidateMutation } from "@/lib/query-keys";
export function SaveEventButton({
  eventId,
  slug,
  title,
  startAt,
  isDemo = false,
}: {
  eventId: string;
  slug: string;
  title: string;
  startAt: string;
  isDemo?: boolean;
}) {
  const { session, isReady } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [initialNow] = useState(() => Date.now());
  const query = useQuery({
    queryKey: privateKey("saved-membership", session?.user.id, eventId),
    queryFn: () => getSavedMembership(eventId),
    enabled: isReady && session?.user.role === "ATTENDEE",
    staleTime: 30000,
    retry: false,
  });
  const saved = !!query.data?.saved;
  const wrongRole = !!session && session.user.role !== "ATTENDEE";
  async function toggle() {
    if (lock.current) return;
    if (!session) {
      router.push(
        `/auth/sign-in?next=${encodeURIComponent(`${isDemo ? "/demo/events" : "/events"}/${encodeURIComponent(slug)}?save=${eventId}`)}`,
      );
      return;
    }
    if (query.isError) {
      void query.refetch();
      return;
    }
    if (!query.data) return;
    lock.current = true;
    setPending(true);
    setMessage("");
    try {
      if (saved) await removeSavedEvent(eventId);
      else await saveEvent(eventId);
      await invalidateMutation(client, session.user.id, "save");
      setMessage(
        saved
          ? "Removed from saved events."
          : "Saved to your account. This does not reserve tickets.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Saved state could not be updated.",
      );
      await query.refetch();
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  const expired = Date.parse(startAt) <= initialNow;
  const disabled =
    pending ||
    !isReady ||
    wrongRole ||
    (!!session && query.isPending) ||
    (!saved && !query.isError && (query.data ? !query.data.canSave : expired));
  return (
    <div>
      <Button
        aria-pressed={query.data ? saved : undefined}
        aria-label={
          wrongRole
            ? "Saving requires an attendee account"
            : `${saved ? "Remove" : "Save"} ${title}${saved ? " from" : " to"} saved events`
        }
        disabled={disabled}
        onClick={() => void toggle()}
      >
        {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}{" "}
        {pending
          ? "Updating…"
          : wrongRole
            ? "Attendee saves only"
            : query.isError
              ? "Retry saved state"
              : saved
                ? "Saved — remove"
                : expired
                  ? "Event has started"
                  : "Save event"}
      </Button>
      <p role="status" style={{ fontSize: 13 }}>
        {message ||
          (query.isError
            ? "Saved state is unavailable. Retry before changing it."
            : "")}
      </p>
    </div>
  );
}
export function SaveIntentNotice({ eventId }: { eventId: string }) {
  const params = useSearchParams();
  const { session } = useAuth();
  if (params.get("save") !== eventId) return null;
  return (
    <p role="status">
      {session
        ? "You returned to the event you wanted to save. Use Save event to finish; it will be stored in your account."
        : "Sign in to save this event to your account. Saving never reserves stock."}
    </p>
  );
}
