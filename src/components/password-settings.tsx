"use client";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { Button, Field, Input } from "./ui";
import { FormFeedback, reportFormError, useFormFields } from "./form-feedback";
import { apiClient, jsonBody } from "@/lib/api-client";
const schema = z
  .object({
    currentPassword: z.string().min(1),
    password: z.string().min(12).max(128),
    confirmation: z.string(),
  })
  .refine((v) => v.password === v.confirmation, {
    path: ["confirmation"],
    message: "Passwords must match.",
  });
export function PasswordSettings() {
  const { clearSession } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", password: "", confirmation: "" },
  });
  const field = useFormFields(form);
  if (!open)
    return <Button onClick={() => setOpen(true)}>Change password</Button>;
  return (
    <section>
      <h2>Change password</h2>
      <p>
        This signs out all devices. Shared account credentials cannot be
        changed.
      </p>
      <form
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await apiClient(
              "/api/users/me/password",
              z.object({ message: z.string() }),
              {
                method: "POST",
                ...jsonBody({
                  currentPassword: values.currentPassword,
                  password: values.password,
                }),
              },
            );
            form.reset();
            clearSession();
            router.replace("/auth/sign-in");
            router.refresh();
          } catch (e) {
            reportFormError(form, e);
          }
        })}
      >
        <Field label="Current password">
          <Input
            type="password"
            autoComplete="current-password"
            {...field("currentPassword")}
          />
        </Field>
        <Field label="New password (12–128 characters)">
          <Input
            type="password"
            autoComplete="new-password"
            {...field("password")}
          />
          <FormFeedback form={form} name="password" />
        </Field>
        <Field label="Confirm new password">
          <Input
            type="password"
            autoComplete="new-password"
            {...field("confirmation")}
          />
          <FormFeedback form={form} name="confirmation" />
        </Field>
        <FormFeedback form={form} />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Change password and sign out
        </Button>
        <Button
          disabled={form.formState.isSubmitting}
          onClick={() => {
            form.reset();
            setOpen(false);
          }}
        >
          Cancel
        </Button>
      </form>
    </section>
  );
}
