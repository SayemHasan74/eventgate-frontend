"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod";
import { useAuth } from "./auth-provider";
import { Button, Field, Input } from "./ui";
import {
  FormFeedback,
  reportFormError,
  useFormFields,
  useUnsavedChanges,
} from "./form-feedback";
import {
  accountProfileFormSchema,
  profileFormSchema,
} from "@/lib/form-schemas";
import {
  updateCheckoutProfile,
  updateProfile,
  type Profile,
} from "@/lib/profile-api";
import { invalidateMutation } from "@/lib/query-keys";
import styles from "./workspace.module.css";
const fields = [
  ["phone", "Phone", "tel"],
  ["address", "Address", "street-address"],
  ["city", "City", "address-level2"],
  ["postalCode", "Postal code", "postal-code"],
  ["country", "Country", "country-name"],
] as const;
export function ProfileForm({
  profile,
  onSaved,
  checkout = false,
  onCancel,
}: {
  profile: Profile;
  onSaved?: () => void;
  checkout?: boolean;
  onCancel?: () => void;
}) {
  const client = useQueryClient();
  const { retrySession } = useAuth();
  const form = useForm<z.infer<typeof accountProfileFormSchema>>({
    resolver: zodResolver(
      checkout
        ? profileFormSchema.extend({
            displayName: accountProfileFormSchema.shape.displayName,
          })
        : accountProfileFormSchema,
    ),
    defaultValues: {
      displayName: profile.displayName,
      phone: profile.phone ?? "",
      address: profile.address ?? "",
      city: profile.city ?? "",
      postalCode: profile.postalCode ?? "",
      country: profile.country ?? "",
    },
  });
  const field = useFormFields(form);
  useUnsavedChanges(form.formState.isDirty);
  const submit = form.handleSubmit(async (values) => {
    form.clearErrors();
    try {
      if (checkout) {
        await updateCheckoutProfile({
          phone: values.phone,
          address: values.address,
          city: values.city,
          postalCode: values.postalCode,
          country: values.country,
        });
      } else
        await updateProfile({
          ...values,
          phone: values.phone || null,
          address: values.address || null,
          city: values.city || null,
          postalCode: values.postalCode || null,
          country: values.country || null,
        });
      form.reset(values);
      await invalidateMutation(client, profile.id, "profile");
      await retrySession();
      toast.success(checkout ? "Checkout profile saved." : "Profile saved.");
      onSaved?.();
    } catch (error) {
      reportFormError(form, error);
    }
  });
  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {!checkout && (
        <>
          <Field label="Display name">
            <Input {...field("displayName")} autoComplete="name" />
            <FormFeedback
              form={form}
              name="displayName"
              id={field.errorId("displayName")}
            />
          </Field>
          <Field label="Email (read-only)">
            <Input type="email" value={profile.email} readOnly />
          </Field>
        </>
      )}
      <p>
        Contact details used for payment. Your account role is managed by an
        administrator.
      </p>
      {fields.map(([name, label, autoComplete]) => (
        <Field key={name} label={label}>
          <Input
            {...field(name)}
            autoComplete={autoComplete}
            type={name === "phone" ? "tel" : "text"}
          />
          <FormFeedback form={form} name={name} id={field.errorId(name)} />
        </Field>
      ))}
      <FormFeedback form={form} />
      <p role="status">
        {form.formState.isDirty
          ? "You have unsaved changes."
          : "No unsaved changes."}
      </p>
      <Button
        type="button"
        disabled={!form.formState.isDirty || form.formState.isSubmitting}
        onClick={() => form.reset()}
      >
        Discard changes
      </Button>
      {onCancel && (
        <Button
          disabled={form.formState.isSubmitting}
          onClick={() => {
            form.reset();
            onCancel();
          }}
        >
          Cancel editing
        </Button>
      )}
      <Button
        type="submit"
        variant="primary"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting
          ? "Saving…"
          : checkout
            ? "Save checkout profile"
            : "Save profile"}
      </Button>
    </form>
  );
}
