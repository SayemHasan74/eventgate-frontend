"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import {
  FormFeedback,
  reportFormError,
  useFormFields,
} from "@/components/form-feedback";
import { refundReviewSchema } from "@/lib/form-schemas";
import { reviewAdminRefund } from "@/lib/admin-refund-api";
import { invalidateMutation } from "@/lib/query-keys";
import styles from "./admin-refunds.module.css";
export function RefundReviewForm({ refundId }: { refundId: string }) {
  const { session } = useAuth();
  const client = useQueryClient();
  const form = useForm<z.infer<typeof refundReviewSchema>>({
    resolver: zodResolver(refundReviewSchema),
    defaultValues: { decision: "approve", reviewerNote: "" },
  });
  const field = useFormFields(form);
  const submit = form.handleSubmit(async ({ decision, reviewerNote }) => {
    if (!session) return;
    form.clearErrors();
    try {
      await reviewAdminRefund(refundId, decision, reviewerNote || undefined);
      await invalidateMutation(client, session.user.id, "refund");
      toast.success(
        decision === "approve"
          ? "Refund approved for processing."
          : "Refund rejected.",
      );
    } catch (error) {
      reportFormError(form, error);
    }
  });
  return (
    <form noValidate onSubmit={submit}>
      <label>
        Review note (required to reject)
        <textarea {...field("reviewerNote")} rows={3} maxLength={1000} />
        <FormFeedback
          form={form}
          name="reviewerNote"
          id={field.errorId("reviewerNote")}
        />
      </label>
      <FormFeedback form={form} />
      <button
        type="submit"
        className="button button-primary"
        disabled={form.formState.isSubmitting}
        onClick={() => form.setValue("decision", "approve")}
      >
        Approve
      </button>
      <button
        type="submit"
        className={styles.reject}
        disabled={form.formState.isSubmitting}
        onClick={() => form.setValue("decision", "reject")}
      >
        Reject
      </button>
    </form>
  );
}
