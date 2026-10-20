"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { ReadFailure } from "@/components/read-failure";
import { AuthApiError, signOut } from "@/lib/auth-api";
import { getAccountOverview } from "@/lib/account-api";
import { privateKey } from "@/lib/query-keys";
import { formatMoney, formatEventDate } from "@/lib/format";
import styles from "./account.module.css";

export function AccountDashboard() {
  const { isReady, session, clearSession } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const attendee = session?.user.role === "ATTENDEE";
  const overview = useQuery({
    queryKey: privateKey("overview", session?.user.id, "me", {}),
    queryFn: getAccountOverview,
    enabled: isReady && attendee,
    retry: false,
  });
  const logout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not sign out. Please retry.",
      );
      if (!(error instanceof AuthApiError && error.sessionEnded)) {
        setSigningOut(false);
        return;
      }
    }
    clearSession();
    router.push("/");
    router.refresh();
  };
  if (!isReady) return <p className={styles.loading}>Opening your account…</p>;
  if (!session)
    return (
      <section className={styles.gate}>
        <h1>Sign in to open your account.</h1>
        <Link
          className="button button-primary"
          href="/auth/sign-in?next=/account"
        >
          Sign in →
        </Link>
      </section>
    );
  const data = overview.data;
  const next = data?.upcomingTickets[0];
  return (
    <div className={styles.dashboard}>
      <header className={styles.hero}>
        <div>
          <p className="eyebrow">
            <span />
            {session.user.role.toLowerCase()} account
          </p>
          <h1>
            Hi, <b>{session.user.displayName}.</b>
          </h1>
          <p>{session.user.email}</p>
        </div>
        <button
          className={styles.logout}
          type="button"
          disabled={signingOut}
          onClick={() => void logout()}
        >
          <LogOut size={15} />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </header>
      <nav className={styles.shortcuts} aria-label="Account shortcuts">
        <Link className="button" href="/account/profile">
          Edit profile / link Google
        </Link>
        {attendee ? (
          <>
            <Link className="button" href="/orders">
              Order history
            </Link>
            <Link className="button" href="/tickets">
              Issued passes
            </Link>
            <Link className="button" href="/refunds">
              Refund requests
            </Link>
            <Link className="button" href="/events">
              Find events
            </Link>
          </>
        ) : (
          <Link
            className="button button-primary"
            href={session.user.role === "ADMIN" ? "/admin" : "/organizer"}
          >
            Open your{" "}
            {session.user.role === "ADMIN"
              ? "control room"
              : "organizer overview"}{" "}
            →
          </Link>
        )}
      </nav>
      {!attendee ? (
        <section className={styles.overviewPanel}>
          <h2>Your role workspace</h2>
          <p>
            Your shared profile is available here. Event management and platform
            operations are in your role workspace; purchasing and private passes
            require an attendee account.
          </p>
        </section>
      ) : overview.isPending ? (
        <p>Loading your overview…</p>
      ) : overview.isError ? (
        <ReadFailure
          error={overview.error}
          retry={() => void overview.refetch()}
          fetching={overview.isFetching}
          next="/account"
        />
      ) : (
        data && (
          <>
            <section className={styles.profile} aria-label="Account counts">
              <div>
                <span>Active issued passes</span>
                <strong>{data.activeTickets}</strong>
              </div>
              <div>
                <span>Active unpaid holds</span>
                <strong>{data.activeHoldsCount}</strong>
              </div>
              <div>
                <span>Refund attention</span>
                <strong>{data.refundRequests}</strong>
              </div>
            </section>
            <section className={styles.overviewPanel}>
              <p className="eyebrow">
                <span />
                Next upcoming booked event
              </p>
              {next ? (
                <>
                  <h2>{next.event.title}</h2>
                  <p>
                    {formatEventDate(next.event.startAt)} · {next.event.venue},{" "}
                    {next.event.city}
                  </p>
                  <div className={styles.shortcuts}>
                    <Link
                      className="button button-primary"
                      href={`/tickets/${next.id}`}
                    >
                      Open your pass →
                    </Link>
                    <Link className="button" href={`/orders/${next.orderId}`}>
                      Booking details
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <h2>No upcoming booked event</h2>
                  <p>
                    Issued passes for future published events appear here after
                    payment.
                  </p>
                  <Link className="text-link" href="/events">
                    Browse events →
                  </Link>
                </>
              )}
            </section>
            <section className={styles.overviewPanel}>
              <h2>Active unpaid reservations</h2>
              <p>
                Showing up to five nearest deadlines. A hold is not an issued
                pass.
              </p>
              {data.activeHolds.length ? (
                <div className={styles.orderList}>
                  {data.activeHolds.map((hold) => (
                    <Link
                      className={styles.orderCard}
                      key={hold.id}
                      href={`/orders/${hold.id}`}
                    >
                      <div>
                        <h3>{hold.eventNameSnapshot}</h3>
                        <p>
                          {hold.quantity} × {hold.ticketTierNameSnapshot} · Hold
                          deadline {formatEventDate(hold.reservationExpiresAt)}
                        </p>
                      </div>
                      <strong>
                        {formatMoney(hold.totalAmountPaisaSnapshot)} →
                      </strong>
                    </Link>
                  ))}
                </div>
              ) : (
                <p>No active unpaid holds.</p>
              )}
            </section>
            <section className={styles.overviewPanel}>
              <h2>Recent orders</h2>
              <p>
                These are booking records, not QR passes. Open a paid order for
                its issued tickets.
              </p>
              {data.recentOrders.length ? (
                <div className={styles.orderList}>
                  {data.recentOrders.map((order) => (
                    <Link
                      className={styles.orderCard}
                      key={order.id}
                      href={`/orders/${order.id}`}
                    >
                      <div>
                        <span className={styles.status}>
                          {order.status.replaceAll("_", " ")}
                        </span>
                        <h3>{order.eventNameSnapshot}</h3>
                        <p>
                          {order.quantity} × {order.ticketTierNameSnapshot} ·{" "}
                          {formatEventDate(order.createdAt)}
                        </p>
                      </div>
                      <strong>
                        {formatMoney(order.totalAmountPaisaSnapshot)} →
                      </strong>
                    </Link>
                  ))}
                </div>
              ) : (
                <p>No orders yet.</p>
              )}
              <Link className="text-link" href="/orders">
                Search all orders →
              </Link>
            </section>
            <section className={styles.overviewPanel}>
              <h2>Refund attention</h2>
              <p>
                Requests under review or needing follow-up; provider completion
                is not instant.
              </p>
              {data.refundAttention.length ? (
                <ul>
                  {data.refundAttention.map((refund) => (
                    <li key={refund.id}>
                      <Link href={`/refunds/${refund.id}`}>
                        {refund.order.eventNameSnapshot} · {refund.status} ·{" "}
                        {formatMoney(refund.amountPaisa)}
                      </Link>{" "}
                      · <Link href={`/orders/${refund.orderId}`}>Order</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No refund requests need attention.</p>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
