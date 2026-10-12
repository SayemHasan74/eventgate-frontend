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
import { profileFormSchema } from "@/lib/form-schemas";
import { updateCheckoutProfile, type Profile } from "@/lib/profile-api";
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
}: {
  profile: Profile;
  onSaved?: () => void;
  checkout?: boolean;
}) {
  const client = useQueryClient();
  const { retrySession } = useAuth();
  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
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
      await updateCheckoutProfile(values);
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
        <p>
          {profile.displayName} · {profile.email}
        </p>
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
