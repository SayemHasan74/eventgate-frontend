"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import {
  FormFeedback,
  reportFormError,
  useFormFields,
} from "@/components/form-feedback";
import { Button, Field, Input } from "@/components/ui";
import { Modal } from "@/components/ui/interactive";
import { tierFormSchema } from "@/lib/form-schemas";
import { bdtToPaisa, dhakaLocalToUtc, utcToDhakaLocal } from "@/lib/format";
import {
  createTicketTier,
  updateTicketTier,
  type ManagedTier,
  type ManagedEventDetail,
  type UpdateTicketTierInput,
} from "@/lib/organizer-api";
import { invalidateMutation } from "@/lib/query-keys";
import styles from "./tier-manager.module.css";
type Values = z.infer<ReturnType<typeof tierFormSchema>>;
export function TierEditor({
  event,
  tier,
  onDismiss,
}: {
  event: ManagedEventDetail;
  tier?: ManagedTier;
  onDismiss: () => void;
}) {
  const { session } = useAuth();
  const client = useQueryClient();
  const editable = tier?.editableFields ?? [
    "name",
    "pricePaisa",
    "capacity",
    "salesStartAt",
    "salesEndAt",
    "salesPaused",
  ];
  const form = useForm<Values>({
    resolver: async (values, context, options) =>
      zodResolver(
        tierFormSchema(event.startAt, {
          requireFutureStart:
            !tier || values.salesStartAt !== utcToDhakaLocal(tier.salesStartAt),
          minimumCapacity: tier?.minimumCapacity,
          futureEnd:
            event.status === "PUBLISHED" &&
            values.salesEndAt !== utcToDhakaLocal(tier?.salesEndAt ?? ""),
        }),
      )(values, context, options),
    defaultValues: {
      name: tier?.name ?? "",
      price: tier ? (tier.pricePaisa / 100).toFixed(2) : "",
      capacity: tier?.capacity ?? 1,
      salesStartAt: tier ? utcToDhakaLocal(tier.salesStartAt) : "",
      salesEndAt: tier ? utcToDhakaLocal(tier.salesEndAt) : "",
      salesPaused: tier?.salesPaused ?? false,
    },
  });
  const field = useFormFields(form);
  const submit = form.handleSubmit(async (values) => {
    if (!session) return;
    form.clearErrors();
    try {
      const payload = {
        name: values.name,
        pricePaisa: bdtToPaisa(values.price),
        capacity: values.capacity,
        salesStartAt: dhakaLocalToUtc(values.salesStartAt),
        salesEndAt: dhakaLocalToUtc(values.salesEndAt),
        salesPaused: values.salesPaused,
      };
      const updates: UpdateTicketTierInput = {};
      if (tier) {
        if (form.formState.dirtyFields.name && editable.includes("name"))
          updates.name = payload.name;
        if (form.formState.dirtyFields.price && editable.includes("pricePaisa"))
          updates.pricePaisa = payload.pricePaisa;
        if (
          form.formState.dirtyFields.capacity &&
          editable.includes("capacity")
        )
          updates.capacity = payload.capacity;
        if (
          form.formState.dirtyFields.salesStartAt &&
          editable.includes("salesStartAt")
        )
          updates.salesStartAt = payload.salesStartAt;
        if (
          form.formState.dirtyFields.salesEndAt &&
          editable.includes("salesEndAt")
        )
          updates.salesEndAt = payload.salesEndAt;
        if (
          form.formState.dirtyFields.salesPaused &&
          editable.includes("salesPaused")
        )
          updates.salesPaused = payload.salesPaused;
        if (!Object.keys(updates).length) {
          onDismiss();
          return;
        }
        await updateTicketTier(event.id, tier.id, updates);
      } else await createTicketTier(event.id, payload);
      await invalidateMutation(client, session.user.id, "tier");
      toast.success(tier ? "Ticket tier saved." : "Ticket tier created.");
      onDismiss();
    } catch (error) {
      reportFormError(form, error, { pricePaisa: "price" });
    }
  });
  return (
    <Modal
      open
      title={tier ? `Edit ${tier.name}` : "Add ticket tier"}
      onDismiss={onDismiss}
      busy={form.formState.isSubmitting}
    >
      <p>
        Capacity is the total stock, not an extra allocation. Sold and reserved
        tickets remain protected.
      </p>
      {tier &&
        (event.status === "PUBLISHED" ||
          tier.restrictionCodes.includes("TIER_HISTORY_LOCKED")) && (
          <p>
            Name, price and sales start are locked. Capacity may only increase;
            sales end cannot exceed the event start.
          </p>
        )}
      <form className={styles.form} onSubmit={submit} noValidate>
        <Field label="Tier name">
          <Input
            {...field("name")}
            readOnly={!editable.includes("name")}
            maxLength={100}
          />
          <FormFeedback form={form} name="name" id={field.errorId("name")} />
        </Field>
        <Field label="Price (BDT)">
          <Input
            {...field("price")}
            readOnly={!editable.includes("pricePaisa")}
            type="number"
            min="0.01"
            step="0.01"
          />
          <FormFeedback form={form} name="price" id={field.errorId("price")} />
        </Field>
        <Field
          label={`Total capacity (minimum ${Math.max(1, tier?.minimumCapacity ?? 1)})`}
        >
          <Input
            {...field("capacity", { valueAsNumber: true })}
            type="number"
            min={Math.max(1, tier?.minimumCapacity ?? 1)}
            step="1"
          />
          <FormFeedback
            form={form}
            name="capacity"
            id={field.errorId("capacity")}
          />
        </Field>
        <Field label="Sales start (Bangladesh, UTC+06:00)">
          <Input
            {...field("salesStartAt")}
            type="datetime-local"
            readOnly={!editable.includes("salesStartAt")}
          />
          <FormFeedback
            form={form}
            name="salesStartAt"
            id={field.errorId("salesStartAt")}
          />
        </Field>
        <Field label="Sales end (Bangladesh, UTC+06:00)">
          <Input {...field("salesEndAt")} type="datetime-local" />
          <FormFeedback
            form={form}
            name="salesEndAt"
            id={field.errorId("salesEndAt")}
          />
        </Field>
        <label>
          <input {...field("salesPaused")} type="checkbox" /> Pause ticket sales
        </label>
        <FormFeedback
          form={form}
          name="salesPaused"
          id={field.errorId("salesPaused")}
        />
        <FormFeedback form={form} />
        <div className={styles.actions}>
          <Button onClick={onDismiss} disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={
              form.formState.isSubmitting || (!!tier && !form.formState.isDirty)
            }
          >
            {form.formState.isSubmitting ? "Saving…" : "Save tier"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
