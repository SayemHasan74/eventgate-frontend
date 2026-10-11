"use client";
import { invalidatePrivate } from "@/lib/query-keys";
import { privateKey } from "@/lib/query-keys";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, LoaderCircle, Pencil, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import {
  getPaymentAttempt,
  PaymentApiError,
  startCheckout,
} from "@/lib/payment-api";
import {
  getProfile,
  ProfileApiError,
  updateCheckoutProfile,
} from "@/lib/profile-api";

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
  const [isSaving, setIsSaving] = useState(false);
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
      void invalidatePrivate(queryClient, userId, [
        "orders",
        "tickets",
        "refunds",
        "overview",
      ]);
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

  const saveProfile = async (formData: FormData) => {
    setIsSaving(true);
    try {
      await updateCheckoutProfile({
        phone: String(formData.get("phone") ?? "").trim(),
        address: String(formData.get("address") ?? "").trim(),
        city: String(formData.get("city") ?? "").trim(),
        postalCode: String(formData.get("postalCode") ?? "").trim(),
        country: String(formData.get("country") ?? "").trim(),
      });
      await profileQuery.refetch();
      await invalidatePrivate(queryClient, session.user.id, ["users"]);
      setIsEditing(false);
      toast.success("Checkout profile saved.");
    } catch (error) {
      toast.error(
        error instanceof ProfileApiError
          ? error.message
          : "Could not save your checkout profile.",
      );
    } finally {
      setIsSaving(false);
    }
  };

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
        <form action={saveProfile} className={styles.form}>
          <p>
            SSLCommerz needs these details before it can open a payment session.
          </p>
          <div className={styles.fields}>
            {fields.map((field) => (
              <label key={field.name}>
                <span>{field.label}</span>
                <input
                  autoComplete={field.autoComplete}
                  defaultValue={profile[field.name] ?? ""}
                  name={field.name}
                  placeholder={field.placeholder}
                  required
                />
              </label>
            ))}
          </div>
          <button
            className="button button-primary"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? (
              <LoaderCircle className={styles.spinner} size={16} />
            ) : (
              <Save size={16} />
            )}{" "}
            {isSaving ? "Saving details" : "Save checkout details"}
          </button>
        </form>
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
