"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui";
import { confirmVerification } from "@/lib/notifications-api";
import { invalidateMutation } from "@/lib/query-keys";
import styles from "@/components/notifications.module.css";
export default function VerifyEmail() {
  const { session } = useAuth();
  const client = useQueryClient();
  const lock = useRef(false);
  const token = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  async function confirm() {
    if (!session || lock.current) return;
    lock.current = true;
    setPending(true);
    setMessage("");
    try {
      if (token.current === null) {
        token.current =
          new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
      if (!/^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/.test(token.current))
        throw new Error(
          "No valid verification link was found. Sign in and reopen the link from your email, or request a new one from your profile.",
        );
      await confirmVerification(token.current);
      token.current = "";
      setVerified(true);
      await invalidateMutation(client, session.user.id, "notification");
      setMessage(
        "Your account email is verified. Email preferences remain under your control.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Email could not be verified. Request a new link if this one has expired.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <div className={styles.panel}>
      <h1>Verify your email</h1>
      <p>
        This verifies the email on your signed-in EventGate account. It does not
        change your role or subscribe you to email updates.
      </p>
      <p>
        If you had to sign in first, reopen the original emailed link before
        continuing.
      </p>
      <Button
        variant="primary"
        disabled={!session || pending || verified}
        onClick={() => void confirm()}
      >
        {pending
          ? "Verifying…"
          : verified
            ? "Email verified"
            : "Verify this account email"}
      </Button>
      <p role="status">{message}</p>
      <Link className="text-link" href="/account/profile">
        Return to profile and notification settings →
      </Link>
    </div>
  );
}
