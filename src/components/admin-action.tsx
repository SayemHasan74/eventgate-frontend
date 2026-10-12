"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Textarea } from "./ui";
import { Modal } from "./ui/interactive";
import { FormFeedback, reportFormError, useFormFields } from "./form-feedback";
export function AdminAction({
  label,
  description,
  onConfirm,
  confirmation,
  disabled = false,
}: {
  label: string;
  description: string;
  onConfirm: (reason: string) => Promise<unknown>;
  confirmation?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  return (
    <>
      <Button disabled={disabled} onClick={() => setOpen(true)}>
        {label}
      </Button>
      {notice && (
        <p role="status">
          {notice}
          {jobId && (
            <>
              {" "}
              <Link href={`/admin/operations?jobId=${jobId}`}>
                Inspect queued job
              </Link>
            </>
          )}
        </p>
      )}
      {open && (
        <ActionDialog
          label={label}
          description={description}
          confirmation={confirmation}
          onConfirm={async (reason) => {
            const result = await onConfirm(reason);
            setNotice(
              "Request accepted. The refreshed record shows the authoritative outcome.",
            );
            setJobId(
              result &&
                typeof result === "object" &&
                "jobId" in result &&
                z.uuid().safeParse(result.jobId).success
                ? String(result.jobId)
                : null,
            );
            return result;
          }}
          close={() => setOpen(false)}
        />
      )}
    </>
  );
}
function ActionDialog({
  label,
  description,
  onConfirm,
  confirmation,
  close,
}: {
  label: string;
  description: string;
  onConfirm: (reason: string) => Promise<unknown>;
  confirmation?: string;
  close: () => void;
}) {
  const schema = z.object({
    reason: z.string().trim().min(5).max(1000),
    confirmation: z
      .string()
      .refine(
        (value) => !confirmation || value === confirmation,
        "Type the exact confirmation text.",
      ),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "", confirmation: "" },
  });
  const field = useFormFields(form);
  return (
    <Modal
      open
      title={label}
      onDismiss={close}
      busy={form.formState.isSubmitting}
    >
      <p>{description}</p>
      <form
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          form.clearErrors();
          try {
            await onConfirm(values.reason);
            close();
          } catch (error) {
            reportFormError(form, error);
          }
        })}
      >
        {confirmation && (
          <Field label={`Type “${confirmation}”`}>
            <Input {...field("confirmation")} autoComplete="off" />
            <FormFeedback
              form={form}
              name="confirmation"
              id={field.errorId("confirmation")}
            />
          </Field>
        )}
        <Field label="Reason (saved in audit history)">
          <Textarea {...field("reason")} maxLength={1000} rows={3} />
          <FormFeedback
            form={form}
            name="reason"
            id={field.errorId("reason")}
          />
        </Field>
        <FormFeedback form={form} />
        <Button disabled={form.formState.isSubmitting} onClick={close}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="danger"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Submitting…" : label}
        </Button>
      </form>
    </Modal>
  );
}
