"use client";

import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import featureStyles from "@/components/auth-styles.module.css";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { signInSchema, registrationSchema } from "@/lib/form-schemas";
import {
  reportFormError,
  useFormFields,
  FormFeedback,
} from "@/components/form-feedback";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/components/auth-provider";
import { GoogleSignIn } from "@/components/google-sign-in";
import {
  AuthApiError,
  register,
  signIn,
  signInDemo,
  signInWithGoogle,
} from "@/lib/auth-api";

type AuthFormProps = Readonly<{ mode: "sign-in" | "register" }>;
type AuthValues = z.infer<typeof signInSchema> & { displayName?: string };

const safeNextPath = (
  value: string | null,
  role: "ATTENDEE" | "ORGANIZER" | "ADMIN",
) =>
  value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : role === "ADMIN"
      ? "/admin"
      : role === "ORGANIZER"
        ? "/organizer"
        : "/account";

export function AuthForm({ mode }: AuthFormProps) {
  const isRegister = mode === "register";
  const { setSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<AuthValues>({
    resolver: zodResolver(isRegister ? registrationSchema : signInSchema),
    defaultValues: {
      displayName: isRegister ? "" : undefined,
      email: "",
      password: "",
    },
  });

  const field = useFormFields(form);
  const submit = form.handleSubmit(async ({ email, password, displayName }) => {
    if (isRegister && !displayName) return;

    setMutationError("");
    setIsSubmitting(true);
    try {
      const session = isRegister
        ? await register({ email, password, displayName: displayName ?? "" })
        : await signIn({ email, password });
      setSession(session);
      toast.success(
        isRegister
          ? "Account created. You are signed in."
          : `Welcome back, ${session.user.displayName}.`,
      );
      router.push(safeNextPath(searchParams.get("next"), session.user.role));
    } catch (error) {
      const message =
        error instanceof AuthApiError
          ? error.message
          : "Could not reach EventGate. Please try again.";
      reportFormError(form, error);
      setMutationError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  });

  const alternatePath = isRegister ? "/auth/sign-in" : "/auth/register";
  const next = searchParams.get("next");
  const alternateHref = next
    ? `${alternatePath}?next=${encodeURIComponent(next)}`
    : alternatePath;
  const googleLogin = async (idToken: string) => {
    setMutationError("");
    setIsSubmitting(true);
    try {
      const session = await signInWithGoogle(idToken);
      setSession(session);
      toast.success(`Welcome, ${session.user.displayName}.`);
      router.push(safeNextPath(searchParams.get("next"), session.user.role));
    } catch (error) {
      const message =
        error instanceof AuthApiError
          ? error.message
          : "Google sign-in could not be completed.";
      setMutationError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };
  const demoLogin = async (role: "ATTENDEE" | "ORGANIZER") => {
    setMutationError("");
    setIsSubmitting(true);
    try {
      const session = await signInDemo(role);
      setSession(session);
      toast.success(`Demo access: ${session.user.displayName}.`);
      router.push(safeNextPath(searchParams.get("next"), session.user.role));
    } catch (error) {
      const message =
        error instanceof AuthApiError
          ? error.message
          : "Demo sign-in is unavailable on this deployment.";
      setMutationError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className={[featureStyles["auth-form"]].join(" ")}
      noValidate
    >
      {mutationError && <p role="alert">{mutationError}</p>}
      {isRegister && (
        <label>
          <span>Your name</span>
          <input
            autoComplete="name"
            placeholder="e.g. Samira Rahman"
            {...field("displayName")}
            required
          />
          <FormFeedback
            form={form}
            name="displayName"
            id={field.errorId("displayName")}
          />
        </label>
      )}
      <label>
        <span>Email address</span>
        <input
          autoComplete="email"
          placeholder="you@example.com"
          type="email"
          {...field("email")}
          required
        />
        <FormFeedback form={form} name="email" id={field.errorId("email")} />
      </label>
      <label>
        <span>Password</span>
        <div className={[featureStyles["auth-password-field"]].join(" ")}>
          <input
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={12}
            maxLength={128}
            placeholder="At least 12 characters"
            required
            type={showPassword ? "text" : "password"}
            {...field("password")}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((shown) => !shown)}
            type="button"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </label>
      <FormFeedback
        form={form}
        name="password"
        id={field.errorId("password")}
      />
      <p className={[featureStyles["auth-password-note"]].join(" ")}>
        Passwords must contain 12–128 characters.
      </p>
      <button
        className="button button-primary"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <LoaderCircle
            className={[featureStyles["auth-spinner"]].join(" ")}
            size={17}
          />
        ) : (
          <ArrowRight size={17} />
        )}
        {isSubmitting
          ? "Please wait"
          : isRegister
            ? "Create attendee account"
            : "Sign in"}
      </button>
      <p className={[featureStyles["auth-switch-text"]].join(" ")}>
        {isRegister ? "Already have an account?" : "New to EventGate?"}{" "}
        <Link href={alternateHref}>
          {isRegister ? "Sign in" : "Create one"}
        </Link>
      </p>
      {!isRegister && (
        <Link className="text-link" href="/auth/forgot-password">
          Forgot password?
        </Link>
      )}
      {!isRegister && (
        <GoogleSignIn disabled={isSubmitting} onCredential={googleLogin} />
      )}
      {!isRegister && (
        <div className={featureStyles["auth-demo"]}>
          <span>Quick access</span>
          <div>
            {(
              [
                ["ATTENDEE", "Attendee demo"],
                ["ORGANIZER", "Organizer demo"],
              ] as const
            ).map(([role, label]) => (
              <button
                key={role}
                disabled={isSubmitting}
                onClick={() => void demoLogin(role)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <small>
            Shared accounts on the live application. Use your own account for
            personal bookings.
          </small>
        </div>
      )}
    </form>
  );
}
