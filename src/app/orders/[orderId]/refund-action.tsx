"use client";
import { useQueryClient } from "@tanstack/react-query";
import { invalidatePrivate } from "@/lib/query-keys";

import { LoaderCircle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import { RefundApiError, requestRefund } from "@/lib/refund-api";

import styles from "./refund-action.module.css";

export function RefundAction({
  orderId,
  status,
}: Readonly<{ orderId: string; status: string }>) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  if (status !== "PAID") return null;

  const request = async () => {
    if (!session) return;
    setIsRequesting(true);
    try {
      setErrorMessage("");
      await requestRefund(orderId, message);
      await invalidatePrivate(queryClient, session.user.id, [
        "orders",
        "tickets",
        "refunds",
      ]);
      setRequested(true);
      toast.success("Refund request sent for review.");
    } catch (error) {
      setErrorMessage(
        error instanceof RefundApiError
          ? error.message
          : "Refund request could not be completed.",
      );
      toast.error(
        error instanceof RefundApiError
          ? error.message
          : "Refund request could not be completed.",
      );
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <section className={styles.action}>
      <div>
        <RotateCcw size={19} aria-hidden="true" />
        <p>{requested ? "Refund request sent" : "Need a refund?"}</p>
        <span>
          {requested
            ? "Your request is waiting for an administrator review."
            : "Eligible paid orders can be requested for review up to 24 hours before the event."}
        </span>
      </div>
      {!requested && (
        <label>
          Reason (optional)
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={1000}
            rows={3}
          />
        </label>
      )}
      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!requested && (
        <button disabled={isRequesting} onClick={request} type="button">
          {isRequesting ? (
            <LoaderCircle className={styles.spinner} size={15} />
          ) : (
            "Request refund"
          )}
        </button>
      )}
    </section>
  );
}
