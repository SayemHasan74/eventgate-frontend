"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { useAuth } from "./auth-provider";
import { getOrder } from "@/lib/order-api";
import { getPaymentAttempt } from "@/lib/payment-api";
import { ApiError } from "@/lib/api-error";
import { privateKey, invalidateMutation } from "@/lib/query-keys";
import {
  paymentReturnState,
  paymentPollDelay,
} from "@/lib/payment-return-state";
import {
  checkoutContextHint,
  subscribeCheckoutContext,
  clearCheckoutContext,
} from "@/lib/checkout-context";
import { readBookingIntent, clearBookingIntent } from "@/lib/booking-intent";
import { clearOperationKey } from "@/lib/operation-keys";

export function PaymentReturnStatus({
  orderId,
  returnPath,
}: {
  orderId: string | null;
  returnPath: string;
}) {
  const { session, isReady } = useAuth();
  const client = useQueryClient();
  const [stopped, setStopped] = useState(false);
  const [run, setRun] = useState(0);
  const hint = useSyncExternalStore(
    subscribeCheckoutContext,
    checkoutContextHint,
    () => null,
  );
  const confirmed = useRef<string | null>(null);
  const enabled = isReady && session?.user.role === "ATTENDEE" && !!orderId;
  const query = useQuery({
    queryKey: privateKey(
      "payment-return",
      session?.user.id,
      orderId ?? "unknown",
      {},
    ),
    queryFn: async ({ signal }) => {
      const order = await getOrder(orderId!, signal);
      if (order.id !== orderId)
        throw new ApiError(
          "Order response did not match this return.",
          502,
          "INVALID_API_RESPONSE",
        );
      const latest = order.paymentAttempts[0];
      if (latest) {
        const attempt = await getPaymentAttempt(latest.id, signal);
        if (attempt.orderId !== order.id || attempt.id !== latest.id)
          throw new ApiError(
            "Payment response did not match this order.",
            502,
            "INVALID_API_RESPONSE",
          );
        order.paymentAttempts = [attempt, ...order.paymentAttempts.slice(1)];
      }
      return order;
    },
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
  const refetch = query.refetch;
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let closed = false;
    let reading = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const began = performance.now();
    const tick = async () => {
      if (disposed || closed || reading) return;
      if (performance.now() - began >= 180000) {
        setStopped(true);
        return;
      }
      if (document.visibilityState !== "visible") return;
      reading = true;
      const result = await refetch({ cancelRefetch: false });
      reading = false;
      if (disposed) return;
      setStopped(false);
      if (
        result.error instanceof ApiError &&
        [401, 403, 404].includes(result.error.status)
      ) {
        closed = true;
        return;
      }
      if (
        result.data &&
        !result.isError &&
        paymentReturnState(result.data).terminal
      ) {
        closed = true;
        return;
      }
      const elapsed = performance.now() - began;
      const delay = paymentPollDelay(elapsed);
      if (delay === null) {
        setStopped(true);
        return;
      }
      timer = setTimeout(() => void tick(), Math.min(delay, 180000 - elapsed));
    };
    const visible = () => {
      if (timer) clearTimeout(timer);
      if (document.visibilityState === "visible") void tick();
    };
    void tick();
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [enabled, session?.user.id, orderId, run, refetch]);
  const order = query.data;
  const state = order ? paymentReturnState(order) : null;
  useEffect(() => {
    if (!order || !session || query.isError || !state?.terminal) return;
    clearOperationKey("checkout", session.user.id, order.id);
    clearCheckoutContext(order.id);
    const intent = readBookingIntent(order.eventId, order.event.slug);
    if (
      intent &&
      intent.tierId === order.ticketTierId &&
      intent.quantity === order.quantity &&
      intent.createdAt <= Date.parse(order.createdAt)
    )
      clearBookingIntent();
    if (state.state === "paid" && confirmed.current !== order.id) {
      confirmed.current = order.id;
      void invalidateMutation(client, session.user.id, "payment");
    }
  }, [order, session, query.isError, state?.terminal, state?.state, client]);
  const next = orderId
    ? `${returnPath}?orderId=${encodeURIComponent(orderId)}`
    : returnPath;
  const inaccessible =
    query.error instanceof ApiError &&
    [401, 403, 404].includes(query.error.status);
  return (
    <main id="main-content" className="wrap payment-result">
      <p className="eyebrow">
        <span /> Verified payment status
      </p>
      {!orderId ? (
        <>
          <h1>
            Find your <b>order.</b>
          </h1>
          <p>
            This return could not be matched to a known transaction. It does not
            confirm success or failure.
          </p>
          {hint && (
            <p>
              <Link className="text-link" href={`/orders/${hint}`}>
                Review this tab’s recent checkout →
              </Link>
              <br />
              This is only a recovery hint, not proof that it belongs to this
              return.
            </p>
          )}
        </>
      ) : !isReady ? (
        <>
          <Clock3 size={36} />
          <h1>Opening your session…</h1>
        </>
      ) : !session ? (
        <>
          <h1>
            Sign in to <b>verify.</b>
          </h1>
          <p>
            Only the attendee who owns this order can view its payment and
            tickets.
          </p>
          <Link
            className="button button-primary"
            href={`/auth/sign-in?next=${encodeURIComponent(next)}`}
          >
            Sign in and return here →
          </Link>
        </>
      ) : session.user.role !== "ATTENDEE" ? (
        <>
          <h1>Attendee account required.</h1>
          <p>
            Use the attendee account that made this booking. Your current role
            cannot read private attendee orders.
          </p>
        </>
      ) : inaccessible ? (
        <>
          <h1>This order is unavailable.</h1>
          <p>
            You may not own this order, it may not exist, or your session may
            have ended. No payment outcome is being claimed.
          </p>
        </>
      ) : (
        <>
          {state?.state === "paid" ? (
            <CheckCircle2 size={42} />
          ) : (
            <Clock3 size={42} />
          )}
          <h1>{state?.title ?? "Verifying your payment…"}</h1>
          <p role="status">
            {state?.message ??
              "Reading authenticated order and provider-attempt state. The URL is not payment proof."}
          </p>
          {query.isError && (
            <p role="alert">
              Status could not be refreshed.{" "}
              {order
                ? "The displayed state is the last confirmed read."
                : "No outcome has been confirmed."}
            </p>
          )}
          {order && (
            <p>
              {order.eventNameSnapshot} · Order #
              {order.id.slice(0, 8).toUpperCase()} ·{" "}
              {order.status.replaceAll("_", " ")}
            </p>
          )}
          {stopped && !state?.terminal && (
            <p>
              Automatic checking has paused after three minutes. This is not a
              payment failure. Keep the order link and check again later.
            </p>
          )}
          <div className="payment-return-actions">
            <button
              className="button"
              type="button"
              disabled={query.isFetching}
              onClick={() => setRun((value) => value + 1)}
            >
              {query.isFetching ? "Checking…" : "Check again"}
            </button>
            <Link className="button" href={`/orders/${orderId}`}>
              Open this order →
            </Link>
          </div>
          {state?.state === "paid" && order && (
            <div className="payment-return-actions">
              {order.ticketIds.map((id, index) => (
                <Link
                  className="button button-primary"
                  key={id}
                  href={`/tickets/${id}`}
                >
                  Open ticket {index + 1} →
                </Link>
              ))}
            </div>
          )}
        </>
      )}
      <div className="payment-return-actions">
        <Link className="text-link" href="/orders">
          My orders
        </Link>
        <Link className="text-link" href="/account">
          My account
        </Link>
      </div>
    </main>
  );
}
