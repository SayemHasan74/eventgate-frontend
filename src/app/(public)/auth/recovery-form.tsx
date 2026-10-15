"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/components/auth-provider";
import { Button, Field, Input } from "@/components/ui";
import {
  FormFeedback,
  reportFormError,
  useFormFields,
} from "@/components/form-feedback";
import { apiClient, jsonBody } from "@/lib/api-client";
const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(12).max(128),
  confirmation: z.string(),
});
export function RecoveryForm({ reset = false }: { reset?: boolean }) {
  const { clearSession } = useAuth();
  const token = useRef<string | null>(null);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const validation = reset
    ? schema
        .omit({ email: true })
        .refine((v) => v.password === v.confirmation, {
          path: ["confirmation"],
          message: "Passwords must match.",
        })
    : schema.pick({ email: true });
  const form = useForm({
    resolver: zodResolver(validation),
    defaultValues: reset ? { password: "", confirmation: "" } : { email: "" },
  });
  const field = useFormFields(form);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await form.handleSubmit(async (values) => {
      try {
        if (reset && token.current === null) {
          token.current =
            new URLSearchParams(window.location.hash.slice(1)).get("token") ??
            "";
          window.history.replaceState(null, "", window.location.pathname);
        }
        if (
          reset &&
          !/^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/.test(token.current ?? "")
        )
          throw new Error(
            "Reopen the complete reset link from your email, or request a new one.",
          );
        const result = await apiClient(
          "/api/auth/" + (reset ? "reset-password" : "request-password-reset"),
          z.object({ message: z.string() }),
          {
            method: "POST",
            ...jsonBody(
              reset
                ? {
                    token: token.current,
                    password: "password" in values ? values.password : "",
                  }
                : { email: "email" in values ? values.email : "" },
            ),
          },
        );
        if (reset) {
          token.current = "";
          clearSession();
        }
        form.reset();
        setMessage(result.message);
        setDone(true);
      } catch (e) {
        reportFormError(form, e);
      }
    })(event);
  }
  return (
    <main id="main-content" className="wrap not-found">
      <h1>{reset ? "Reset password" : "Account recovery"}</h1>
      <p>
        {reset
          ? "Choose a new password. The link expires after 30 minutes and works once."
          : "Enter your own account email. Shared demo accounts cannot use password recovery."}
      </p>
      {!done && (
        <form
          noValidate
          style={{ display: "grid", gap: 16, width: "min(100%,480px)" }}
          onSubmit={submit}
        >
          {!reset ? (
            <Field label="Your email">
              <Input type="email" autoComplete="email" {...field("email")} />
              <FormFeedback form={form} name="email" />
            </Field>
          ) : (
            <>
              <Field label="New password (12–128 characters)">
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field("password")}
                />
                <FormFeedback form={form} name="password" />
              </Field>
              <Field label="Confirm password">
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field("confirmation")}
                />
                <FormFeedback form={form} name="confirmation" />
              </Field>
            </>
          )}
          <FormFeedback form={form} />
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? "Submitting…"
              : reset
                ? "Set new password"
                : "Send recovery email"}
          </Button>
        </form>
      )}
      <p role="status">{message}</p>
      <Link className="text-link" href="/auth/sign-in">
        Back to sign in
      </Link>
    </main>
  );
}
