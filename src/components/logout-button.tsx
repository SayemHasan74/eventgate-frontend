"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { signOut, AuthApiError } from "@/lib/auth-api";
import { useAuth } from "./auth-provider";
import { Button, FieldError } from "./ui";
export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const { clearSession } = useAuth();
  const router = useRouter();
  const logout = async () => {
    setPending(true);
    setError("");
    try {
      await signOut();
    } catch (error) {
      if (!(error instanceof AuthApiError && error.sessionEnded)) {
        setError(
          error instanceof Error
            ? error.message
            : "Sign-out failed. Please retry.",
        );
        setPending(false);
        return;
      }
    }
    clearSession();
    toast.success("Signed out.");
    router.replace("/auth/sign-in");
    router.refresh();
  };
  return (
    <div>
      <Button onClick={() => void logout()} disabled={pending}>
        <LogOut size={16} />
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      <FieldError>{error}</FieldError>
    </div>
  );
}
