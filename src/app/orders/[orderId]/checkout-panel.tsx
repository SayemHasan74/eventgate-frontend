"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, LoaderCircle, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getPaymentAttempt, startCheckout } from "@/lib/payment-api";
import { getOrder, type OrderDetail } from "@/lib/order-api";
import { getProfile } from "@/lib/profile-api";
import { profileFormSchema } from "@/lib/form-schemas";
import { ProfileForm } from "@/components/profile-form";
import { privateKey, invalidateMutation } from "@/lib/query-keys";
import {
  operationKey,
  clearOperationKey,
  definitiveFailure,
} from "@/lib/operation-keys";
import styles from "./checkout-panel.module.css";
import { rememberCheckout } from "@/lib/checkout-context";

export function CheckoutPanel({
  order,
  payable,
}: {
  order: OrderDetail;
  payable: boolean;
}) {
  const client = useQueryClient();
  const { isReady, session } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const starting = useRef(false);
  const [startedAttemptId, setStartedAttemptId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const attemptId = startedAttemptId ?? order.paymentAttempts[0]?.id ?? null;
  const attemptQuery = useQuery({
    queryKey: privateKey("payments", session?.user.id, attemptId ?? "none", {}),
    queryFn: () => getPaymentAttempt(attemptId!),
    enabled: isReady && !!session && !!attemptId,
    retry: false,
    refetchInterval: (query) =>
      ["INITIATING", "PENDING", "UNKNOWN"].includes(
        query.state.data?.status ?? "",
      )
        ? 5000
        : false,
    refetchIntervalInBackground: false,
  });
  const profileQuery = useQuery({
    queryKey: privateKey("users", session?.user.id, "me", {}),
    queryFn: getProfile,
    enabled: isReady && !!session && payable,
    retry: false,
  });
  const status =
    attemptQuery.data?.status ??
    order.paymentAttempts.find((item) => item.id === attemptId)?.status;
  const userId = session?.user.id;
  useEffect(() => {
    if (status === "SUCCEEDED" && userId) {
      clearOperationKey("checkout", userId, order.id);
      void invalidateMutation(client, userId, "payment");
    }
  }, [status, userId, order.id, client]);
  const profile = profileQuery.data;
  const profileValid = profile
    ? profileFormSchema.safeParse(profile).success
    : false;
  const uncertain =
    !!attemptId && (!status || ["INITIATING", "UNKNOWN"].includes(status));
  const terminalFailure = status === "FAILED" || status === "CANCELLED";
  const canStart =
    payable &&
    !order.financialReviewRequired &&
    profileValid &&
    (!attemptId || terminalFailure || status === "PENDING") &&
    !attemptQuery.isError &&
    !isEditing;

  const beginCheckout = async () => {
    if (!session || starting.current || !canStart) return;
    starting.current = true;
    setIsStarting(true);
    setCheckoutError("");
    try {
      // Re-read authoritative eligibility. Never treat the displayed timer as payment authorization.
      const current = await getOrder(order.id);
      if (!current.payable || current.financialReviewRequired) {
        await invalidateMutation(client, session.user.id, "order");
        setCheckoutError(
          "This reservation is no longer eligible for checkout. Review the refreshed order and existing payment status.",
        );
        return;
      }
      const latest = current.paymentAttempts[0];
      if (
        latest &&
        !["FAILED", "CANCELLED", "PENDING"].includes(latest.status)
      ) {
        setStartedAttemptId(latest.id);
        setCheckoutError(
          "An existing payment needs verification. Check its status; do not start another payment.",
        );
        return;
      }
      if (latest && ["FAILED", "CANCELLED"].includes(latest.status))
        clearOperationKey("checkout", session.user.id, order.id);
      const key = operationKey("checkout", session.user.id, order.id);
      const result = await startCheckout(order.id, key);
      setStartedAttemptId(result.paymentAttemptId);
      rememberCheckout(order.id, result.paymentAttemptId);
      if (result.status === "AVAILABLE") {
        window.location.assign(result.checkoutUrl);
      } else {
        setCheckoutError(
          result.status === "UNKNOWN"
            ? "The provider outcome is unknown. Keep this order and check status; do not make another payment."
            : "Checkout is processing. We will look up the existing attempt; no second payment has been started.",
        );
        await invalidateMutation(client, session.user.id, "payment");
      }
    } catch (error) {
      if (definitiveFailure(error))
        clearOperationKey("checkout", session.user.id, order.id);
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Checkout could not be confirmed.",
      );
      // A timeout may occur after the server persisted an attempt. Read it back, never retry the mutation automatically.
      await invalidateMutation(client, session.user.id, "order");
    } finally {
      starting.current = false;
      setIsStarting(false);
    }
  };
  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <CreditCard size={21} />
        <div>
          <p>Payment and checkout profile</p>
          <h2>
            {order.status === "PAID"
              ? "Payment confirmed"
              : payable
                ? "Secure payment"
                : "Payment status"}
          </h2>
        </div>
      </div>
      {checkoutError && <p role="alert">{checkoutError}</p>}
      {attemptId && (
        <div className={styles.ready} role="status">
          <h3>Existing payment · {status ?? "Looking up"}</h3>
          <p>
            {status === "SUCCEEDED"
              ? "The capture is verified. The order and issued passes show whether fulfillment completed; any late capture or refund remains tracked."
              : status === "UNKNOWN"
                ? "The provider outcome is uncertain. Do not pay again. Check this attempt or contact the platform administrator if it remains unresolved."
                : status === "INITIATING"
                  ? "The provider is preparing this checkout. We are looking up the same attempt."
                  : status === "PENDING"
                    ? payable
                      ? "An existing checkout can be resumed while the reservation remains eligible."
                      : "Payment confirmation is still pending. An elapsed reservation does not prove that no money moved."
                    : terminalFailure
                      ? "The provider confirmed this attempt failed or was cancelled. A new attempt is allowed only while the reservation remains eligible."
                      : "Checking the existing payment. Do not make another payment while its outcome is unconfirmed."}
          </p>
          <p>Attempt {attemptId.slice(0, 8)}</p>
          {attemptQuery.isError && (
            <p role="alert">
              Status lookup failed. The payment outcome is not confirmed. Retry
              the read, not the payment.
            </p>
          )}
          <button
            type="button"
            className="button"
            disabled={attemptQuery.isFetching}
            onClick={() => {
              void attemptQuery.refetch();
              void invalidateMutation(client, session!.user.id, "order");
            }}
          >
            Check payment status
          </button>
        </div>
      )}
      {!payable && order.status === "PENDING_PAYMENT" && (
        <p role="status">
          New checkout is disabled until an authoritative read confirms an
          active, eligible reservation. Existing payment outcomes can still be
          checked.
        </p>
      )}
      {uncertain && (
        <p>
          Verification is required before another checkout. There is no
          automatic payment retry.
        </p>
      )}
      {payable &&
        (profileQuery.isLoading ? (
          <p>
            <LoaderCircle className={styles.spinner} size={20} /> Loading your
            checkout profile…
          </p>
        ) : profileQuery.isError || !profile ? (
          <div>
            <p role="alert">Your checkout profile could not load.</p>
            <button
              className="button"
              type="button"
              disabled={profileQuery.isFetching}
              onClick={() => void profileQuery.refetch()}
            >
              Retry profile
            </button>
          </div>
        ) : (
          <div className={styles.ready}>
            <h3>Contact details for payment</h3>
            {!session?.user.isQuickAccess && (isEditing || !profileValid) ? (
              <ProfileForm
                key={profile.id}
                profile={profile}
                checkout
                onSaved={() => setIsEditing(false)}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <>
                <p>
                  {profile.phone} · {profile.address}, {profile.city},{" "}
                  {profile.postalCode}, {profile.country}
                </p>
                {!session?.user.isQuickAccess && (
                  <button
                    className={styles.edit}
                    type="button"
                    disabled={isStarting}
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil size={14} /> Edit profile independently
                  </button>
                )}
                {session?.user.isQuickAccess && (
                  <p>
                    Shared access uses the saved fictional checkout details.
                    Contact changes are disabled.
                  </p>
                )}
              </>
            )}
            <button
              className="button button-primary"
              type="button"
              disabled={!canStart || isStarting}
              onClick={() => void beginCheckout()}
            >
              {isStarting ? (
                <LoaderCircle className={styles.spinner} size={16} />
              ) : (
                <CreditCard size={16} />
              )}
              {isStarting
                ? "Checking existing checkout…"
                : status === "PENDING"
                  ? "Resume existing checkout"
                  : terminalFailure
                    ? "Start a new payment attempt"
                    : "Pay with SSLCommerz"}
            </button>
            {!profileValid && (
              <p role="status">
                {session?.user.isQuickAccess
                  ? "Shared checkout details need administrator repair. Use your own attendee account meanwhile."
                  : "Complete and save valid contact details before paying. Failed saves keep your entered values."}
              </p>
            )}
          </div>
        ))}
    </section>
  );
}
