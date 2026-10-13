"use client";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth-provider";
import { privateKey, invalidateMutation } from "@/lib/query-keys";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  requestVerification,
  preferenceFields,
  type Preferences,
  type PreferenceFields,
} from "@/lib/notifications-api";
import { Button, Skeleton } from "./ui";
import { ReadFailure } from "./read-failure";
import styles from "./notifications.module.css";
const options: Array<[keyof PreferenceFields, string, string]> = [
  [
    "inAppEnabled",
    "In-app updates",
    "Keep useful activity messages in your inbox.",
  ],
  [
    "emailEnabled",
    "Email updates",
    "Requires verified email and a configured provider.",
  ],
  [
    "bookingUpdates",
    "Booking and refund updates",
    "Payment, event cancellation and refund changes.",
  ],
  [
    "savedEventReminders",
    "Saved-event reminders",
    "Applies when saved-event reminders are available.",
  ],
  [
    "waitlistAlerts",
    "Waitlist availability alerts",
    "Applies when waitlists are available; not a ticket reservation.",
  ],
  [
    "marketingEmail",
    "Marketing email consent",
    "Off by default. This does not subscribe you to a campaign.",
  ],
  [
    "personalizedEmail",
    "Personalized email consent",
    "Off by default. No personalized email campaign is currently running.",
  ],
];
function SettingsForm({
  preferences,
  onSaved,
}: {
  preferences: Preferences;
  onSaved: () => Promise<unknown>;
}) {
  const form = useForm<PreferenceFields>({
    resolver: zodResolver(preferenceFields),
    defaultValues: preferenceFields.parse(preferences),
  });
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [verifying, setVerifying] = useState(false);
  async function save(values: PreferenceFields) {
    if (lock.current) return;
    lock.current = true;
    setMessage("");
    try {
      const updated = await saveNotificationPreferences(values);
      form.reset(preferenceFields.parse(updated));
      await onSaved();
      setMessage("Notification preferences saved.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Preferences were not saved.",
      );
    } finally {
      lock.current = false;
    }
  }
  async function verify() {
    if (lock.current) return;
    lock.current = true;
    setVerifying(true);
    setMessage("");
    try {
      const result = await requestVerification();
      setMessage(result.message);
      await onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Verification request could not complete.",
      );
    } finally {
      lock.current = false;
      setVerifying(false);
    }
  }
  return (
    <>
      <p>
        {preferences.emailVerifiedAt
          ? "Your account email is verified."
          : "Your account email is not verified. Regular email updates cannot be delivered yet."}
      </p>
      {!preferences.emailAvailable && (
        <p role="status">{preferences.emailConfigurationMessage}</p>
      )}
      {!preferences.emailVerifiedAt && (
        <Button
          disabled={
            !preferences.emailAvailable ||
            verifying ||
            form.formState.isSubmitting
          }
          onClick={() => void verify()}
        >
          {verifying ? "Requesting…" : "Send verification email"}
        </Button>
      )}
      <p>
        Verification links expire after 30 minutes and work once, while signed
        in to the same account. Verification alone does not enable email
        updates.
      </p>
      <form onSubmit={(event) => void form.handleSubmit(save)(event)}>
        <fieldset disabled={verifying || form.formState.isSubmitting}>
          <legend>Channels and update categories</legend>
          <div className={styles.options}>
            {options.map(([name, label, hint]) => (
              <label key={name}>
                <input type="checkbox" {...form.register(name)} />
                <span>
                  <strong>{label}</strong>
                  <br />
                  <small>{hint}</small>
                </span>
              </label>
            ))}
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={!form.formState.isDirty || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Saving…" : "Save preferences"}
          </Button>
        </fieldset>
        <p role="status">{message}</p>
      </form>
    </>
  );
}
export function NotificationSettings() {
  const { session } = useAuth();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: privateKey("notification-preferences", session?.user.id),
    queryFn: getNotificationPreferences,
    enabled: !!session,
    retry: false,
  });
  return (
    <div className={styles.panel}>
      <h2>Notification preferences</h2>
      <p>
        In-app notifications work without email credentials. Security updates
        use your chosen channel settings; booking categories are controlled
        separately.
      </p>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ReadFailure
          error={query.error}
          retry={() => void query.refetch()}
          fetching={query.isFetching}
          next="/account/profile"
        />
      ) : (
        <SettingsForm
          key={session?.user.id}
          preferences={query.data}
          onSaved={() =>
            session
              ? invalidateMutation(client, session.user.id, "notification")
              : Promise.resolve()
          }
        />
      )}
    </div>
  );
}
