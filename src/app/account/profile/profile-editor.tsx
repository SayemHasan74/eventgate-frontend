"use client";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Button, Field, Input, FieldError, Skeleton } from "@/components/ui";
import { ErrorState } from "@/components/ui/interactive";
import {
  getProfile,
  updateCheckoutProfile,
  type Profile,
} from "@/lib/profile-api";
import { privateKey, invalidatePrivate } from "@/lib/query-keys";
import styles from "@/components/workspace.module.css";
function ProfileForm({ profile }: { profile: Profile }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const client = useQueryClient();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = Object.fromEntries(
      ["phone", "address", "city", "postalCode", "country"].map((key) => [
        key,
        String(form.get(key) ?? "").trim(),
      ]),
    );
    setPending(true);
    setError("");
    try {
      await updateCheckoutProfile(
        input as Parameters<typeof updateCheckoutProfile>[0],
      );
      await invalidatePrivate(client, profile.id, ["users"]);
      toast.success("Profile saved.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not save your profile. Retry when connected.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <form className={styles.form} onSubmit={submit}>
      <p>
        {profile.displayName} · {profile.email}
      </p>
      <p>
        Update the contact details used for payment. Your role is managed by the
        administrator.
      </p>
      {(["phone", "address", "city", "postalCode", "country"] as const).map(
        (key) => (
          <Field
            key={key}
            label={
              key === "postalCode"
                ? "Postal code"
                : key[0].toUpperCase() + key.slice(1)
            }
          >
            <Input
              name={key}
              defaultValue={profile[key] ?? ""}
              required
              minLength={
                key === "phone"
                  ? 6
                  : key === "address"
                    ? 5
                    : key === "postalCode"
                      ? 3
                      : 2
              }
              maxLength={
                key === "address"
                  ? 500
                  : key === "phone"
                    ? 30
                    : key === "postalCode"
                      ? 20
                      : 100
              }
              autoComplete={
                key === "phone"
                  ? "tel"
                  : key === "address"
                    ? "street-address"
                    : key === "city"
                      ? "address-level2"
                      : key === "postalCode"
                        ? "postal-code"
                        : "country-name"
              }
            />
          </Field>
        ),
      )}
      <FieldError>{error}</FieldError>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
export function ProfileEditor() {
  const { session } = useAuth();
  const query = useQuery({
    queryKey: privateKey("users", session?.user.id, "me", {}),
    queryFn: getProfile,
    enabled: !!session,
  });
  return (
    <section>
      <h1>My profile</h1>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        <ProfileForm key={query.data.id} profile={query.data} />
      )}
    </section>
  );
}
