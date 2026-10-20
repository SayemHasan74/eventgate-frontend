"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Button, Field, Input } from "@/components/ui";
import { Modal, ConfirmationDialog } from "@/components/ui/interactive";
import {
  FormFeedback,
  reportFormError,
  useFormFields,
} from "@/components/form-feedback";
import {
  cancelManagedEvent,
  deleteManagedEvent,
  type ManagedEventDetail,
} from "@/lib/organizer-api";
import { invalidateMutation } from "@/lib/query-keys";
import styles from "./event-workspace.module.css";
function CancelDialog({
  event,
  onDismiss,
}: {
  event: ManagedEventDetail;
  onDismiss: () => void;
}) {
  const { session } = useAuth();
  const client = useQueryClient();
  const schema = z.object({
    title: z
      .string()
      .refine(
        (value) => value === event.title,
        "Type the exact event title to confirm cancellation.",
      ),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { title: "" },
  });
  const field = useFormFields(form);
  const submit = form.handleSubmit(async () => {
    if (!session) return;
    form.clearErrors();
    try {
      await cancelManagedEvent(event.id);
      await Promise.all([
        invalidateMutation(client, session.user.id, "event", event.id),
        invalidateMutation(client, session.user.id, "refund"),
        invalidateMutation(client, session.user.id, "order"),
      ]);
      toast.success(
        "Event cancelled. Refund dispatch is queued; provider refunds are not yet complete.",
      );
      onDismiss();
    } catch (error) {
      reportFormError(form, error);
    }
  });
  return (
    <Modal
      open
      title="Cancel this event?"
      onDismiss={onDismiss}
      busy={form.formState.isSubmitting}
    >
      <p>
        <strong>{event.title}</strong> will be removed from discovery. Admission
        tickets are voided immediately. Cancellation cannot be undone.
      </p>
      <ul>
        <li>
          {event.cancellationImpact.paidOrders} currently paid orders will be
          assessed for refunds.
        </li>
        <li>
          {event.cancellationImpact.activeTickets} active or checked-in tickets
          will be voided.
        </li>
        <li>
          {event.cancellationImpact.pendingOrders} unpaid reservations cannot
          complete checkout for a cancelled event.
        </li>
      </ul>
      <p>
        The background dispatcher creates eligible refunds. Provider processing
        may remain pending or need investigation; cancellation does not mean
        everyone has been refunded.
      </p>
      <form onSubmit={submit} noValidate>
        <Field label={`Type “${event.title}”`}>
          <Input {...field("title")} autoComplete="off" />
          <FormFeedback form={form} name="title" id={field.errorId("title")} />
        </Field>
        <FormFeedback form={form} />
        <div className={styles.actions}>
          <Button disabled={form.formState.isSubmitting} onClick={onDismiss}>
            Keep event
          </Button>
          <Button
            variant="danger"
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Cancelling…" : "Cancel event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function EventLifecycleActions({
  event,
}: {
  event: ManagedEventDetail;
}) {
  const [action, setAction] = useState<"cancel" | "delete" | null>(null);
  const { session } = useAuth();
  const client = useQueryClient();
  const router = useRouter();
  return (
    <>
      <div className={styles.actions}>
        {event.capabilities.canCancel && (
          <Button variant="danger" onClick={() => setAction("cancel")}>
            Cancel event
          </Button>
        )}
        {event.capabilities.canDelete && (
          <Button onClick={() => setAction("delete")}>Delete draft</Button>
        )}
      </div>
      {action === "cancel" && (
        <CancelDialog event={event} onDismiss={() => setAction(null)} />
      )}
      <ConfirmationDialog
        open={action === "delete"}
        title="Delete draft event?"
        description={`Delete “${event.title}”? Only drafts without any order history can be deleted. The event is soft-deleted and its audit history is retained.`}
        confirmLabel="Delete draft"
        onDismiss={() => setAction(null)}
        onConfirm={async () => {
          if (!session)
            throw new Error("Sign in again before deleting this draft.");
          await deleteManagedEvent(event.id);
          await invalidateMutation(client, session.user.id, "event", event.id);
          toast.success("Draft deleted; audit history is retained.");
          router.push("/organizer/events");
        }}
      />
    </>
  );
}
