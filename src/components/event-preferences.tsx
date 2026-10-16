"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth-provider";
import { Button, Field, Select, Skeleton } from "./ui";
import { ReadFailure } from "./read-failure";
import { privateKey, invalidateMutation } from "@/lib/query-keys";
import {
  eventPreferenceFields,
  getEventPreferences,
  saveEventPreferences,
  type EventPreferences,
  type EventPreferenceFields,
} from "@/lib/recommendations-api";
import styles from "./recommendations.module.css";

function PreferenceForm({
  profile,
  onSaved,
}: {
  profile: EventPreferences;
  onSaved: () => Promise<unknown>;
}) {
  const form = useForm<EventPreferenceFields>({
    resolver: zodResolver(eventPreferenceFields),
    values: {
      preferredCity: profile.preferredCity ?? "",
      preferredCategories: profile.preferredCategories,
      personalizationEnabled: profile.personalizationEnabled,
    },
    resetOptions: { keepDirtyValues: true },
  });
  const [message, setMessage] = useState("");
  const categories = [
    ...new Map(
      [...profile.options.categories, ...profile.preferredCategories].map(
        (value) => [value.trim().toLowerCase(), value],
      ),
    ).values(),
  ];
  const cities = [
    ...new Map(
      [
        ...profile.options.cities,
        ...(profile.preferredCity ? [profile.preferredCity] : []),
      ].map((value) => [value.trim().toLowerCase(), value]),
    ).values(),
  ];
  async function save(values: EventPreferenceFields) {
    setMessage("");
    try {
      const updated = await saveEventPreferences(values);
      form.reset({ ...updated, preferredCity: updated.preferredCity ?? "" });
      await onSaved();
      setMessage("Your event preferences are saved.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Preferences could not be saved.",
      );
    }
  }
  return (
    <form onSubmit={(event) => void form.handleSubmit(save)(event)}>
      <fieldset
        disabled={form.formState.isSubmitting}
        className={styles.fields}
      >
        <legend>Choose what interests you</legend>
        <label className={styles.choice}>
          <input type="checkbox" {...form.register("personalizationEnabled")} />
          Personalize my event suggestions
        </label>
        <Field label="Preferred city">
          <Select {...form.register("preferredCity")}>
            <option value="">No preferred city</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset className={styles.fields}>
          <legend>Preferred categories · up to five</legend>
          <div className={styles.choices}>
            {categories.map((category) => (
              <label className={styles.choice} key={category}>
                <input
                  type="checkbox"
                  value={category}
                  {...form.register("preferredCategories")}
                />
                {category}
              </label>
            ))}
          </div>
          {!categories.length && (
            <p>No published event categories are available yet.</p>
          )}
          {form.formState.errors.preferredCategories && (
            <p role="alert">
              {form.formState.errors.preferredCategories.message}
            </p>
          )}
        </fieldset>
        <p>
          Ranking uses only these choices and categories of your saved upcoming
          events: category +4, city +3, saved category +2, starts within 14 days
          +1. Ties use event date, then ID. No payment or contact history is
          used.
        </p>
        <p>
          Switch personalization off for chronological upcoming events. These
          settings do not subscribe you to email.
        </p>
        <Button type="submit" variant="primary">
          {form.formState.isSubmitting ? "Saving…" : "Save event preferences"}
        </Button>
      </fieldset>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
export function EventPreferencesPanel({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(!compact);
  const { session, isReady } = useAuth();
  const userId = session?.user.id;
  const attendee = isReady && session?.user.role === "ATTENDEE";
  const client = useQueryClient();
  const query = useQuery({
    queryKey: privateKey("event-preferences", userId),
    queryFn: getEventPreferences,
    enabled: !!attendee && expanded,
    refetchOnWindowFocus: false,
  });
  if (!attendee) return null;
  const content = query.isError ? (
    <ReadFailure
      error={query.error}
      retry={() => void query.refetch()}
      fetching={query.isFetching}
      next="/account/profile"
    />
  ) : query.data ? (
    <PreferenceForm
      key={userId}
      profile={query.data}
      onSaved={() => invalidateMutation(client, userId!, "eventPreference")}
    />
  ) : (
    <Skeleton />
  );
  return (
    <div className={styles.preferences}>
      {compact ? (
        <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
          <summary>Tune your events</summary>
          {content}
        </details>
      ) : (
        <>
          <h2>Event preferences</h2>
          {content}
        </>
      )}
    </div>
  );
}
