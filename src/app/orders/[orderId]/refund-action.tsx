"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { useAuth } from "@/components/auth-provider";
import { Modal } from "@/components/ui/interactive";
import { RefundTimeline } from "@/components/refund-timeline";
import {
  FormFeedback,
  useFormFields,
  reportFormError,
} from "@/components/form-feedback";
import { refundMessageSchema } from "@/lib/form-schemas";
import { requestRefund, type Refund } from "@/lib/refund-api";
import type { OrderDetail } from "@/lib/order-api";
import { formatMoney } from "@/lib/format";
import { invalidateMutation, privateKey } from "@/lib/query-keys";
import styles from "./refund-action.module.css";
const explanations: Record<string, string> = {
  REFUND_ALREADY_EXISTS:
    "An active or completed refund already exists for this capture.",
  REFUND_WINDOW_CLOSED: "The refund deadline has passed.",
  TICKETS_NOT_UNUSED: "Every pass must be unused and active.",
  EVENT_NOT_PUBLISHED:
    "This event has ended or was cancelled; self-service refunds are closed.",
  PAYMENT_REQUIRES_INVESTIGATION: "Payment requires investigation.",
  CAPTURE_NOT_REFUNDABLE: "This capture cannot currently be refunded.",
  REFUND_REQUEST_LIMIT: "The request limit has been reached.",
  ORDER_NOT_PAID: "This order is not a paid booking.",
};
export function RefundAction({
  order,
  purchaseAction,
}: {
  order: OrderDetail;
  purchaseAction?: ReactNode;
}) {
  const { session } = useAuth();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState<Refund | null>(null);
  const form = useForm<z.infer<typeof refundMessageSchema>>({
    resolver: zodResolver(refundMessageSchema),
    defaultValues: { userMessage: "" },
  });
  const field = useFormFields(form);
  const pending = form.formState.isSubmitting;
  const unseen =
    submitted && !order.refunds.some((refund) => refund.id === submitted.id)
      ? submitted
      : null;
  const eligible = order.refundEligibility.eligible && !unseen;
  const submit = form.handleSubmit(async ({ userMessage }) => {
    if (!session || !eligible) return;
    form.clearErrors();
    try {
      const refund = await requestRefund(order.id, userMessage);
      setSubmitted(refund);
      setOpen(false);
      form.reset();
      await invalidateMutation(client, session.user.id, "refund");
    } catch (error) {
      reportFormError(form, error);
      // Read after an ambiguous mutation outcome; never retry the refund request automatically.
      await client.invalidateQueries({
        queryKey: privateKey("orders", session.user.id, order.id, {}),
      });
    }
  });
  if (order.status !== "PAID" && !order.refunds.length && !unseen) return null;
  return (
    <section className={styles.action}>
      <div className={styles.buttons}>
        {purchaseAction}
        <button
          className="button"
          type="button"
          onClick={() => setOpen(true)}
          disabled={!eligible}
          aria-describedby={`refund-eligibility-${order.id}`}
        >
          Refund
        </button>
        <Link className="text-link" href="/refunds">
          My refunds →
        </Link>
      </div>
      <p id={`refund-eligibility-${order.id}`} role="status">
        {eligible
          ? `Refund requests cover all ${order.quantity} ${order.quantity === 1 ? "ticket" : "tickets"} in this booking and require approval.`
          : unseen
            ? "Your refund request is recorded. Track it in My refunds."
            : order.refundEligibility.reasons
                .map(
                  (reason) =>
                    explanations[reason] ??
                    "This booking is not currently eligible for a refund.",
                )
                .join(" ")}
      </p>
      {(order.refunds.length > 0 || unseen) && (
        <details>
          <summary>Refund history</summary>
          {order.refunds.map((refund) => (
            <section key={refund.id}>
              <RefundTimeline refund={refund} />
              <Link className="text-link" href={`/refunds/${refund.id}`}>
                Open refund details →
              </Link>
            </section>
          ))}
          {unseen && (
            <Link className="text-link" href={`/refunds/${unseen.id}`}>
              Open submitted request →
            </Link>
          )}
        </details>
      )}
      <Modal
        open={open}
        title="Confirm whole-booking refund request"
        onDismiss={() => setOpen(false)}
        busy={pending}
      >
        <p>
          {order.eventNameSnapshot} · {order.quantity} passes ·{" "}
          {formatMoney(order.totalAmountPaisaSnapshot)}
        </p>
        <p>
          Submitting blocks admission while this request is active. Approval
          voids every pass in this booking. An administrator reviews the
          request; submission does not confirm that money has been returned.
        </p>
        <form onSubmit={submit} noValidate>
          <label>
            Your message (optional)
            <textarea {...field("userMessage")} maxLength={1000} rows={4} />
          </label>
          <FormFeedback
            form={form}
            name="userMessage"
            id={field.errorId("userMessage")}
          />
          <FormFeedback form={form} />
          <button
            className="button button-primary"
            type="submit"
            disabled={pending || !eligible}
          >
            {pending ? "Submitting…" : "Submit refund request"}
          </button>
          <button
            className="button"
            type="button"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </form>
      </Modal>
    </section>
  );
}
