"use client";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { Skeleton } from "@/components/ui";
import { ReadFailure } from "@/components/read-failure";
import { getProfile } from "@/lib/profile-api";
import { privateKey, invalidateMutation } from "@/lib/query-keys";
import { ProfileForm } from "@/components/profile-form";
import { GoogleSignIn } from "@/components/google-sign-in";
import { linkGoogle } from "@/lib/auth-api";

export function ProfileEditor() {
  const { session, isReady } = useAuth();
  const client = useQueryClient();
  const busy = useRef(false);
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: privateKey("users", session?.user.id, "me", {}),
    queryFn: getProfile,
    enabled: isReady && !!session,
    retry: false,
  });
  const link = useCallback(
    async (token: string) => {
      if (!session || busy.current) return;
      busy.current = true;
      setLinking(true);
      setMessage("");
      try {
        await linkGoogle(token);
        await invalidateMutation(client, session.user.id, "profile");
        setMessage("Google identity linked to this account.");
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Google linking could not complete. Your existing account is unchanged.",
        );
      } finally {
        busy.current = false;
        setLinking(false);
      }
    },
    [session, client],
  );
  const unavailable = useCallback(
    () =>
      setMessage(
        "Google linking is unavailable or the provider could not load. Your existing sign-in and profile remain available.",
      ),
    [],
  );
  return (
    <section>
      <Link className="text-link" href="/account">
        ← Account overview
      </Link>
      <h1>My profile</h1>
      {!isReady || query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ReadFailure
          error={query.error}
          retry={() => void query.refetch()}
          fetching={query.isFetching}
          next="/account/profile"
        />
      ) : (
        query.data && (
          <>
            {session?.user.isQuickAccess ? <p role="status">This is a shared access account. Profile and identity changes are disabled. Create your own account for personal details.</p> : <ProfileForm key={query.data.id} profile={query.data} />}
            <section>
              <h2>Google sign-in connection</h2>
              <p>
                {session?.user.isQuickAccess
                  ? "Google linking is disabled for this shared account."
                  : query.data.googleLinked
                  ? "A verified Google identity is linked. You can use it to sign in to this same account."
                  : "No Google identity is linked. Connect a verified Google account while signed in; this does not create or change your EventGate role."}
              </p>
              {!query.data.googleLinked && !session?.user.isQuickAccess && (
                <GoogleSignIn
                  onCredential={link}
                  disabled={linking}
                  onUnavailable={unavailable}
                />
              )}
              <p role="status">
                {linking ? "Linking your verified Google identity…" : message}
              </p>
            </section>
          </>
        )
      )}
    </section>
  );
}
