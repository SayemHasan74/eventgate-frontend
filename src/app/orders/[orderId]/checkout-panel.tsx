"use client";
import { invalidateMutation } from "@/lib/query-keys";
import { privateKey } from "@/lib/query-keys";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, LoaderCircle, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import {
  getPaymentAttempt,
  PaymentApiError,
  startCheckout,
} from "@/lib/payment-api";
import { getProfile } from "@/lib/profile-api";
import { ProfileForm } from "@/components/profile-form";

import styles from "./checkout-panel.module.css";

type CheckoutPanelProps = Readonly<{ orderId: string; payable: boolean }>;

const fields = [
  {
    name: "phone",
    label: "Phone",
    placeholder: "01XXXXXXXXX",
    autoComplete: "tel",
  },
  {
    name: "address",
    label: "Address",
    placeholder: "Street and area",
    autoComplete: "street-address",
  },
  {
    name: "city",
    label: "City",
    placeholder: "Dhaka",
    autoComplete: "address-level2",
  },
  {
    name: "postalCode",
    label: "Postal code",
    placeholder: "1200",
    autoComplete: "postal-code",
  },
  {
    name: "country",
    label: "Country",
    placeholder: "Bangladesh",
    autoComplete: "country-name",
  },
] as const;

export function CheckoutPanel({ orderId, payable }: CheckoutPanelProps) {
  const queryClient = useQueryClient();
  const { isReady, session } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const checkoutKey = useRef<{ orderId: string; key: string } | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const attemptQuery = useQuery({
    queryKey: privateKey("payments", session?.user.id, attemptId ?? "none", {}),
    queryFn: () => getPaymentAttempt(attemptId!),
    enabled: Boolean(session && attemptId),
    retry: false,
    refetchInterval: (query) =>
      ["INITIATING", "PENDING", "UNKNOWN"].includes(
        query.state.data?.status ?? "",
      )
        ? 5000
        : false,
    refetchIntervalInBackground: false,
  });
  const userId = session?.user.id;
  useEffect(() => {
    if (attemptQuery.data?.status === "SUCCEEDED" && userId)
      void invalidateMutation(queryClient, userId, "payment");
  }, [attemptQuery.data?.status, userId, queryClient]);
  const profileQuery = useQuery({
    queryKey: privateKey("users", session?.user.id, "me", {}),
    queryFn: () => getProfile(),
    enabled: isReady && Boolean(session) && payable,
    retry: false,
  });

  if (!payable) return null;
  if (!isReady || profileQuery.isLoading)
    return (
      <section className={styles.panel}>
        <LoaderCircle className={styles.spinner} size={22} /> Preparing secure
        checkout…
      </section>
    );
  if (!session || profileQuery.isError || !profileQuery.data)
    return (
      <section className={styles.panel}>
        Checkout profile is unavailable. Please sign in again and retry.
      </section>
    );

  const profile = profileQuery.data;
  const profileComplete = fields.every((field) =>
    Boolean(profile[field.name]?.trim()),
  );

  const beginCheckout = async () => {
    setIsStarting(true);
    setCheckoutError("");
    try {
      if (
        !checkoutKey.current ||
        checkoutKey.current.orderId !== orderId ||
        ["FAILED", "CANCELLED"].includes(attemptQuery.data?.status ?? "")
      )
        checkoutKey.current = { orderId, key: crypto.randomUUID() };
      const checkout = await startCheckout(orderId, checkoutKey.current.key);
      if (checkout.status === "AVAILABLE")
        window.location.assign(checkout.checkoutUrl);
      else {
        setAttemptId(checkout.paymentAttemptId);
        if (attemptId === checkout.paymentAttemptId)
          await attemptQuery.refetch();
      }
    } catch (error) {
      setCheckoutError(
        error instanceof PaymentApiError
          ? error.message
          : "Could not begin secure payment.",
      );
      toast.error(
        error instanceof PaymentApiError
          ? error.message
          : "Could not begin secure payment.",
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <CreditCard size={21} aria-hidden="true" />
        <div>
          <p>Step 2 of 2</p>
          <h2>Secure payment</h2>
        </div>
      </div>
      {checkoutError && <p role="alert">{checkoutError}</p>}
      {attemptId && (
        <div className={styles.ready} role="status">
          <h3>Payment confirmation</h3>
          <p>
            {attemptQuery.data?.status === "SUCCEEDED"
              ? "Your capture is verified. Updating the booking and any refund status…"
              : ["FAILED", "CANCELLED"].includes(
                    attemptQuery.data?.status ?? "",
                  )
                ? "The provider confirmed this attempt did not complete. You can try a new checkout while your reservation is active."
                : "We are checking the existing payment attempt. Do not make another payment while its outcome is uncertain."}
          </p>
          <p>
            Attempt {attemptId.slice(0, 8)} ·{" "}
            {attemptQuery.data?.status ?? "Checking"}
          </p>
          {attemptQuery.isError && (
            <p role="alert">
              Status could not be loaded. Your payment outcome has not been
              confirmed.
            </p>
          )}
          <button
            type="button"
            className={styles.edit}
            disabled={attemptQuery.isFetching}
            onClick={() => void attemptQuery.refetch()}
          >
            Check status
          </button>
        </div>
      )}
      {!profileComplete || isEditing ? (
        <ProfileForm
          profile={profile}
          checkout
          onSaved={() => setIsEditing(false)}
        />
      ) : (
        <div className={styles.ready}>
          <p>Your checkout profile is ready for SSLCommerz.</p>
          <button
            className={styles.edit}
            onClick={() => setIsEditing(true)}
            type="button"
          >
            <Pencil size={14} /> Edit details
          </button>
          <button
            className="button button-primary"
            disabled={isStarting || attemptQuery.data?.status === "SUCCEEDED"}
            onClick={beginCheckout}
            type="button"
          >
            {isStarting ? (
              <LoaderCircle className={styles.spinner} size={16} />
            ) : (
              <CreditCard size={16} />
            )}{" "}
            {isStarting
              ? "Checking checkout"
              : attemptId
                ? "Resume / retry checkout"
                : "Pay with SSLCommerz"}
          </button>
        </div>
      )}
    </section>
  );
}
