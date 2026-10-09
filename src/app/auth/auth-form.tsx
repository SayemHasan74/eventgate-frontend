"use client";

import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import { AuthApiError, register, signIn } from "@/lib/auth-api";

import styles from "./auth.module.css";

type AuthFormProps = Readonly<{ mode: "sign-in" | "register" }>;

const safeNextPath = (value: string | null) =>
  value?.startsWith("/") && !value.startsWith("//") ? value : "/events";

export function AuthForm({ mode }: AuthFormProps) {
  const isRegister = mode === "register";
  const { setSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (formData: FormData) => {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("displayName") ?? "").trim();

    if (isRegister && displayName.length < 2) {
      toast.error("Enter a name with at least two characters.");
      return;
    }
    if (password.length < 12) {
      toast.error("Your password needs at least 12 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const session = isRegister
        ? await register({ email, password, displayName })
        : await signIn({ email, password });
      setSession(session);
      toast.success(isRegister ? "Account created. You are signed in." : `Welcome back, ${session.user.displayName}.`);
      router.push(safeNextPath(searchParams.get("next")));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof AuthApiError ? error.message : "Could not reach EventGate. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const alternatePath = isRegister ? "/auth/sign-in" : "/auth/register";
  const next = searchParams.get("next");
  const alternateHref = next ? `${alternatePath}?next=${encodeURIComponent(next)}` : alternatePath;

  return (
    <form action={submit} className={styles.form}>
      {isRegister && <label><span>Your name</span><input autoComplete="name" name="displayName" placeholder="e.g. Samira Rahman" required /></label>}
      <label><span>Email address</span><input autoComplete="email" name="email" placeholder="you@example.com" required type="email" /></label>
      <label>
        <span>Password</span>
        <div className={styles.passwordField}>
          <input autoComplete={isRegister ? "new-password" : "current-password"} minLength={12} name="password" placeholder="At least 12 characters" required type={showPassword ? "text" : "password"} />
          <button aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((shown) => !shown)} type="button">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </div>
      </label>
      <p className={styles.passwordNote}>Passwords must contain at least 12 characters.</p>
      <button className="button button-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? <LoaderCircle className={styles.spinner} size={17} /> : <ArrowRight size={17} />}
        {isSubmitting ? "Please wait" : isRegister ? "Create attendee account" : "Sign in"}
      </button>
      <p className={styles.switchText}>{isRegister ? "Already have an account?" : "New to EventGate?"} <Link href={alternateHref}>{isRegister ? "Sign in" : "Create one"}</Link></p>
    </form>
  );
}
