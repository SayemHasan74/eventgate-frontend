"use client";

import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import { AuthApiError, register, signIn } from "@/lib/auth-api";


type AuthFormProps = Readonly<{ mode: "sign-in" | "register" }>;

const demoAccounts = [
  { label: "Attendee demo", email: process.env.NEXT_PUBLIC_DEMO_ATTENDEE_EMAIL, password: process.env.NEXT_PUBLIC_DEMO_ATTENDEE_PASSWORD },
  { label: "Organizer demo", email: process.env.NEXT_PUBLIC_DEMO_ORGANIZER_EMAIL, password: process.env.NEXT_PUBLIC_DEMO_ORGANIZER_PASSWORD },
  { label: "Admin demo", email: process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL, password: process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD },
].filter((account): account is { label: string; email: string; password: string } => Boolean(account.email && account.password));

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
  const demoLogin = async (email: string, password: string) => {
    setIsSubmitting(true);
    try {
      const session = await signIn({ email, password });
      setSession(session);
      toast.success(`Signed in as ${session.user.displayName}.`);
      router.push(session.user.role === "ADMIN" ? "/admin" : session.user.role === "ORGANIZER" ? "/organizer" : "/account");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof AuthApiError ? error.message : "Demo sign-in could not be completed.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <form action={submit} className="auth-form">
      {isRegister && <label><span>Your name</span><input autoComplete="name" name="displayName" placeholder="e.g. Samira Rahman" required /></label>}
      <label><span>Email address</span><input autoComplete="email" name="email" placeholder="you@example.com" required type="email" /></label>
      <label>
        <span>Password</span>
        <div className="auth-password-field">
          <input autoComplete={isRegister ? "new-password" : "current-password"} minLength={12} name="password" placeholder="At least 12 characters" required type={showPassword ? "text" : "password"} />
          <button aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((shown) => !shown)} type="button">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </div>
      </label>
      <p className="auth-password-note">Passwords must contain at least 12 characters.</p>
      <button className="button button-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? <LoaderCircle className="auth-spinner" size={17} /> : <ArrowRight size={17} />}
        {isSubmitting ? "Please wait" : isRegister ? "Create attendee account" : "Sign in"}
      </button>
      <p className="auth-switch-text">{isRegister ? "Already have an account?" : "New to EventGate?"} <Link href={alternateHref}>{isRegister ? "Sign in" : "Create one"}</Link></p>
      {!isRegister && demoAccounts.length > 0 && <div className="auth-demo"><span>Quick demo login</span><div>{demoAccounts.map((account) => <button key={account.label} onClick={() => demoLogin(account.email, account.password)} disabled={isSubmitting} type="button">{account.label}</button>)}</div></div>}
    </form>
  );
}
