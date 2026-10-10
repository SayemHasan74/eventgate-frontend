"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard, LoaderCircle, Pencil, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import { PaymentApiError, startCheckout } from "@/lib/payment-api";
import { getProfile, ProfileApiError, updateCheckoutProfile } from "@/lib/profile-api";

import styles from "./checkout-panel.module.css";

type CheckoutPanelProps = Readonly<{ orderId: string; payable: boolean }>;

const fields = [
  { name: "phone", label: "Phone", placeholder: "01XXXXXXXXX", autoComplete: "tel" },
  { name: "address", label: "Address", placeholder: "Street and area", autoComplete: "street-address" },
  { name: "city", label: "City", placeholder: "Dhaka", autoComplete: "address-level2" },
  { name: "postalCode", label: "Postal code", placeholder: "1200", autoComplete: "postal-code" },
  { name: "country", label: "Country", placeholder: "Bangladesh", autoComplete: "country-name" },
] as const;

export function CheckoutPanel({ orderId, payable }: CheckoutPanelProps) {
  const { isReady, session } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const profileQuery = useQuery({
    queryKey: ["checkout-profile", session?.accessToken],
    queryFn: () => getProfile(session!.accessToken),
    enabled: isReady && Boolean(session) && payable,
    retry: false,
  });

  if (!payable) return null;
  if (!isReady || profileQuery.isLoading) return <section className={styles.panel}><LoaderCircle className={styles.spinner} size={22} /> Preparing secure checkout…</section>;
  if (!session || profileQuery.isError || !profileQuery.data) return <section className={styles.panel}>Checkout profile is unavailable. Please sign in again and retry.</section>;

  const profile = profileQuery.data;
  const profileComplete = fields.every((field) => Boolean(profile[field.name]?.trim()));

  const saveProfile = async (formData: FormData) => {
    setIsSaving(true);
    try {
      await updateCheckoutProfile(session.accessToken, {
        phone: String(formData.get("phone") ?? "").trim(),
        address: String(formData.get("address") ?? "").trim(),
        city: String(formData.get("city") ?? "").trim(),
        postalCode: String(formData.get("postalCode") ?? "").trim(),
        country: String(formData.get("country") ?? "").trim(),
      });
      await profileQuery.refetch();
      setIsEditing(false);
      toast.success("Checkout profile saved.");
    } catch (error) {
      toast.error(error instanceof ProfileApiError ? error.message : "Could not save your checkout profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const beginCheckout = async () => {
    setIsStarting(true);
    try {
      const checkout = await startCheckout(session.accessToken, orderId);
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      toast.error(error instanceof PaymentApiError ? error.message : "Could not begin secure payment.");
      setIsStarting(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.heading}><CreditCard size={21} aria-hidden="true" /><div><p>Step 2 of 2</p><h2>Secure payment</h2></div></div>
      {!profileComplete || isEditing ? (
        <form action={saveProfile} className={styles.form}>
          <p>SSLCommerz needs these details before it can open a payment session.</p>
          <div className={styles.fields}>{fields.map((field) => <label key={field.name}><span>{field.label}</span><input autoComplete={field.autoComplete} defaultValue={profile[field.name] ?? ""} name={field.name} placeholder={field.placeholder} required /></label>)}</div>
          <button className="button button-primary" disabled={isSaving} type="submit">{isSaving ? <LoaderCircle className={styles.spinner} size={16} /> : <Save size={16} />} {isSaving ? "Saving details" : "Save checkout details"}</button>
        </form>
      ) : (
        <div className={styles.ready}>
          <p>Your checkout profile is ready for SSLCommerz.</p>
          <button className={styles.edit} onClick={() => setIsEditing(true)} type="button"><Pencil size={14} /> Edit details</button>
          <button className="button button-primary" disabled={isStarting} onClick={beginCheckout} type="button">{isStarting ? <LoaderCircle className={styles.spinner} size={16} /> : <CreditCard size={16} />} {isStarting ? "Opening payment" : "Pay with SSLCommerz"}</button>
        </div>
      )}
    </section>
  );
}
