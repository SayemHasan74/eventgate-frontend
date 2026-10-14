"use client";
import Link from "next/link";
import { useAuth } from "./auth-provider";
export function EventPurchase({
  slug,
  eligible,
  reason,
  isDemo = false,
}: {
  slug: string;
  eligible: boolean;
  reason: string;
  isDemo?: boolean;
}) {
  const { session } = useAuth();
  const wrongRole = session && session.user.role !== "ATTENDEE";
  return (
    <div>
      {wrongRole ? (
        <p role="status">
          Purchasing requires an attendee account. Your{" "}
          {session.user.role.toLowerCase()} account manages events instead. Sign
          out before using an attendee account.
        </p>
      ) : !eligible ? (
        <p role="status">{reason}</p>
      ) : null}
      {eligible && !wrongRole ? (
        <Link
          className="button button-primary"
          href={`${isDemo ? "/demo/events" : "/events"}/${slug}/tickets`}
        >
          Select tickets →
        </Link>
      ) : (
        <button className="button button-primary" disabled type="button">
          {wrongRole ? "Attendee account required" : "Tickets unavailable"}
        </button>
      )}
    </div>
  );
}
