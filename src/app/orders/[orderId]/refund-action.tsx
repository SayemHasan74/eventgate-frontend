"use client";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateMutation } from "@/lib/query-keys";

import { LoaderCircle, RotateCcw } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  FormFeedback,
  useFormFields,
  reportFormError,
} from "@/components/form-feedback";
import { refundMessageSchema } from "@/lib/form-schemas";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import { requestRefund } from "@/lib/refund-api";

import styles from "./refund-action.module.css";

export function RefundAction({
  orderId,
  status,
  eligible,
  reasons,
}: Readonly<{
  orderId: string;
  status: string;
  eligible: boolean;
  reasons: string[];
}>) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const form = useForm<z.infer<typeof refundMessageSchema>>({
    resolver: zodResolver(refundMessageSchema),
    defaultValues: { userMessage: "" },
  });
  const field = useFormFields(form);
  const isRequesting = form.formState.isSubmitting;
  const [requested, setRequested] = useState(false);
  if (status !== "PAID") return null;
  if (!eligible) {
    const messages: Record<string, string> = {
      REFUND_ALREADY_EXISTS:
        "An active or completed refund already exists for this payment.",
      REFUND_WINDOW_CLOSED: "The attendee refund deadline has passed.",
      TICKETS_NOT_UNUSED: "All tickets must be unused and active.",
      EVENT_NOT_PUBLISHED:
        "This event is no longer published; check the order for cancellation processing.",
      PAYMENT_REQUIRES_INVESTIGATION:
        "Payment needs investigation before a refund can be requested.",
      CAPTURE_NOT_REFUNDABLE:
        "This payment cannot currently be refunded through an attendee request.",
      REFUND_REQUEST_LIMIT: "The refund request limit has been reached.",
    };
    return (
      <section className={styles.action}>
        <div>
          <p>Refund request unavailable</p>
          <span>
            {reasons
              .map(
                (reason) =>
                  messages[reason] ??
                  "This booking does not currently meet the refund rules.",
              )
              .join(" ")}
          </span>
          <Link className="text-link" href="/refunds">
            View your refund requests →
          </Link>
        </div>
      </section>
    );
  }

  const request = form.handleSubmit(async ({ userMessage }) => {
    if (!session) return;
    form.clearErrors();
    try {
      await requestRefund(orderId, userMessage);
      await invalidateMutation(queryClient, session.user.id, "refund");
      setRequested(true);
      toast.success("Refund request sent for review.");
    } catch (error) {
      reportFormError(form, error);
    }
  });

  return (
    <form className={styles.action} noValidate onSubmit={request}>
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
          <textarea {...field("userMessage")} maxLength={1000} rows={3} />
          <FormFeedback
            form={form}
            name="userMessage"
            id={field.errorId("userMessage")}
          />
        </label>
      )}
      <FormFeedback form={form} />
      {!requested && (
        <button disabled={isRequesting} type="submit">
          {isRequesting ? (
            <LoaderCircle className={styles.spinner} size={15} />
          ) : (
            "Request refund"
          )}
        </button>
      )}
    </form>
  );
}
