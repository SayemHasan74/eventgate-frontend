"use client";

import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import featureStyles from "@/components/auth-styles.module.css";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/components/auth-provider";
import { GoogleSignIn } from "@/components/google-sign-in";
import {
  AuthApiError,
  register,
  signIn,
  signInWithGoogle,
} from "@/lib/auth-api";

type AuthFormProps = Readonly<{ mode: "sign-in" | "register" }>;
const authSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter a name with at least two characters.")
    .optional(),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(12, "Your password needs at least 12 characters."),
});
type AuthValues = z.infer<typeof authSchema>;

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
    resolver: zodResolver(authSchema),
    defaultValues: {
      displayName: isRegister ? "" : undefined,
      email: "",
      password: "",
    },
  });

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
      router.refresh();
    } catch (error) {
      const message =
        error instanceof AuthApiError
          ? error.message
          : "Could not reach EventGate. Please try again.";
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
      router.refresh();
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
            {...form.register("displayName")}
            required
          />
          {form.formState.errors.displayName && (
            <small>{form.formState.errors.displayName.message}</small>
          )}
        </label>
      )}
      <label>
        <span>Email address</span>
        <input
          autoComplete="email"
          placeholder="you@example.com"
          type="email"
          {...form.register("email")}
          required
        />
        {form.formState.errors.email && (
          <small>{form.formState.errors.email.message}</small>
        )}
      </label>
      <label>
        <span>Password</span>
        <div className={[featureStyles["auth-password-field"]].join(" ")}>
          <input
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={12}
            placeholder="At least 12 characters"
            required
            type={showPassword ? "text" : "password"}
            {...form.register("password")}
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
      {form.formState.errors.password && (
        <small>{form.formState.errors.password.message}</small>
      )}
      <p className={[featureStyles["auth-password-note"]].join(" ")}>
        Passwords must contain at least 12 characters.
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
        <GoogleSignIn disabled={isSubmitting} onCredential={googleLogin} />
      )}
    </form>
  );
}
