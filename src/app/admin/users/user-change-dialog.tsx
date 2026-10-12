"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Modal } from "@/components/ui/interactive";
import { Button, Field, Select } from "@/components/ui";
import {
  FormFeedback,
  reportFormError,
  useFormFields,
} from "@/components/form-feedback";
import { userMutationSchema } from "@/lib/form-schemas";
export type UserCommand =
  | { id: string; path: "role"; body: { role: "ATTENDEE" | "ORGANIZER" } }
  | { id: string; path: "status"; body: { status: "ACTIVE" | "SUSPENDED" } };
export function UserChangeDialog({
  command,
  onDismiss,
  onConfirm,
}: {
  command: UserCommand;
  onDismiss: () => void;
  onConfirm: (command: UserCommand) => Promise<unknown>;
}) {
  const form = useForm<z.infer<typeof userMutationSchema>>({
    resolver: zodResolver(userMutationSchema),
    defaultValues: { path: command.path, ...command.body },
  });
  const field = useFormFields(form);
  const submit = form.handleSubmit(async (values) => {
    form.clearErrors();
    try {
      await onConfirm(
        values.path === "role"
          ? { id: command.id, path: "role", body: { role: values.role } }
          : { id: command.id, path: "status", body: { status: values.status } },
      );
      onDismiss();
    } catch (error) {
      reportFormError(form, error);
    }
  });
  return (
    <Modal
      open
      title="Confirm account change"
      onDismiss={onDismiss}
      busy={form.formState.isSubmitting}
    >
      <p>This changes the user’s access, including their existing sessions.</p>
      <form noValidate onSubmit={submit}>
        <Field label={command.path === "role" ? "New role" : "New status"}>
          <Select {...field(command.path)}>
            {(command.path === "role"
              ? ["ATTENDEE", "ORGANIZER"]
              : ["ACTIVE", "SUSPENDED"]
            ).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
          <FormFeedback
            form={form}
            name={command.path}
            id={field.errorId(command.path)}
          />
        </Field>
        <FormFeedback form={form} />
        <Button
          type="button"
          disabled={form.formState.isSubmitting}
          onClick={onDismiss}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="danger"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Saving…" : "Confirm change"}
        </Button>
      </form>
    </Modal>
  );
}
