"use client";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateMutation } from "@/lib/query-keys";

import { ArrowRight, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  FormFeedback,
  useFormFields,
  reportFormError,
  useUnsavedChanges,
} from "@/components/form-feedback";
import { eventFormSchema, publishedEventFormSchema } from "@/lib/form-schemas";
import { dhakaLocalToUtc, utcToDhakaLocal } from "@/lib/format";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import {
  createManagedEvent,
  updateManagedEvent,
  type ManagedEvent,
} from "@/lib/organizer-api";

import styles from "./event-form.module.css";

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function EventForm({ initialEvent }: { initialEvent?: ManagedEvent }) {
  const queryClient = useQueryClient();
  const { isReady, session } = useAuth();
  const router = useRouter();
  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(
      initialEvent?.status === "PUBLISHED"
        ? publishedEventFormSchema
        : eventFormSchema,
    ),
    defaultValues: initialEvent
      ? {
          ...initialEvent,
          startAt: utcToDhakaLocal(initialEvent.startAt),
          endAt: utcToDhakaLocal(initialEvent.endAt),
          imageUrl: initialEvent.imageUrl ?? "",
        }
      : {
          title: "",
          slug: "",
          description: "",
          category: "",
          venue: "",
          city: "",
          address: "",
          startAt: "",
          endAt: "",
          imageUrl: "",
        },
  });
  const field = useFormFields(form);
  const isSubmitting = form.formState.isSubmitting;
  useUnsavedChanges(form.formState.isDirty);
  const allowed =
    session?.user.role === "ORGANIZER" || session?.user.role === "ADMIN";

  const createEvent = form.handleSubmit(async (values) => {
    if (!session) return;
    form.clearErrors();
    try {
      const input = {
        ...values,
        startAt: dhakaLocalToUtc(values.startAt),
        endAt: dhakaLocalToUtc(values.endAt),
        imageUrl: values.imageUrl || null,
      };
      const created = initialEvent
        ? await updateManagedEvent(
            initialEvent.id,
            initialEvent.status === "PUBLISHED"
              ? {
                  title: input.title,
                  description: input.description,
                  imageUrl: input.imageUrl,
                }
              : Object.fromEntries(
                  Object.entries(input).filter(
                    ([key]) =>
                      key !== "slug" && key in form.formState.dirtyFields,
                  ),
                ),
          )
        : await createManagedEvent(input);
      form.reset(values);
      await invalidateMutation(queryClient, session.user.id, "event");
      toast.success(
        initialEvent ? "Event details saved." : "Draft event created.",
      );
      router.push(`/organizer/events/${created.id}`);
      router.refresh();
    } catch (error) {
      reportFormError(form, error);
    }
  });

  if (!isReady)
    return <p className={styles.loading}>Checking organizer access…</p>;
  if (!session || !allowed)
    return (
      <section className={styles.gate}>
        <h1>Organizer access required.</h1>
        <p>Only organizer or admin accounts can create events.</p>
        <Link
          className="button button-primary"
          href={
            session ? "/organizer" : "/auth/sign-in?next=/organizer/events/new"
          }
        >
          Continue <ArrowRight size={16} />
        </Link>
      </section>
    );

  return (
    <form noValidate onSubmit={createEvent} className={styles.form}>
      <FormFeedback form={form} />
      {initialEvent?.status === "PUBLISHED" && (
        <p>
          Published events can change title, description, and image only. Dates
          and location are locked.
        </p>
      )}
      <section className={styles.section}>
        <p className="eyebrow">
          <span /> Event fundamentals
        </p>
        <h2>
          Start with the <b>room.</b>
        </h2>
        <div className={styles.grid}>
          <label className={styles.wide}>
            <span>Event title</span>
            <input
              maxLength={180}
              {...field("title")}

              placeholder="e.g. Dhaka Design Night"
              required
              onChange={(event) => {
                void form.register("title").onChange(event);
                if (!initialEvent && !form.formState.dirtyFields.slug)
                  form.setValue("slug", toSlug(event.target.value));
              }}
            />
            <FormFeedback
              form={form}
              name="title"
              id={field.errorId("title")}
            />
          </label>
          <label>
            <span>Public URL slug</span>
            <input
              maxLength={200}
              {...field("slug")}
              readOnly={!!initialEvent}

              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="dhaka-design-night"
              required
            />
            <FormFeedback form={form} name="slug" id={field.errorId("slug")} />
          </label>
          <label>
            <span>Category</span>
            <input
              maxLength={80}
              minLength={2}
              {...field("category")}
              readOnly={initialEvent?.status === "PUBLISHED"}
              placeholder="Design"
              required
            />
            <FormFeedback
              form={form}
              name="category"
              id={field.errorId("category")}
            />
          </label>
          <label className={styles.wide}>
            <span>Description</span>
            <textarea
              minLength={20}
              {...field("description")}
              placeholder="Describe what attendees can expect…"
              required
              rows={5}
            />
            <FormFeedback
              form={form}
              name="description"
              id={field.errorId("description")}
            />
          </label>
        </div>
      </section>
      <section className={styles.section}>
        <p className="eyebrow">
          <span /> Date & place
        </p>
        <h2>
          Set the <b>scene.</b>
        </h2>
        <div className={styles.grid}>
          <label>
            <span>Starts (Bangladesh, UTC+06:00)</span>
            <input
              {...field("startAt")}
              readOnly={initialEvent?.status === "PUBLISHED"}
              required
              type="datetime-local"
            />
            <FormFeedback
              form={form}
              name="startAt"
              id={field.errorId("startAt")}
            />
          </label>
          <label>
            <span>Ends (Bangladesh, UTC+06:00)</span>
            <input
              {...field("endAt")}
              readOnly={initialEvent?.status === "PUBLISHED"}
              required
              type="datetime-local"
            />
            <FormFeedback
              form={form}
              name="endAt"
              id={field.errorId("endAt")}
            />
          </label>
          <label>
            <span>Venue</span>
            <input
              maxLength={160}
              minLength={2}
              {...field("venue")}
              readOnly={initialEvent?.status === "PUBLISHED"}
              placeholder="Venue name"
              required
            />
            <FormFeedback
              form={form}
              name="venue"
              id={field.errorId("venue")}
            />
          </label>
          <label>
            <span>City</span>
            <input
              maxLength={100}
              minLength={2}
              {...field("city")}
              readOnly={initialEvent?.status === "PUBLISHED"}
              placeholder="Dhaka"
              required
            />
            <FormFeedback form={form} name="city" id={field.errorId("city")} />
          </label>
          <label className={styles.wide}>
            <span>Full address</span>
            <input
              minLength={5}
              {...field("address")}
              readOnly={initialEvent?.status === "PUBLISHED"}
              placeholder="Street, area, city"
              required
            />
            <FormFeedback
              form={form}
              name="address"
              id={field.errorId("address")}
            />
          </label>
        </div>
      </section>
      <section className={styles.section}>
        <p className="eyebrow">
          <span /> Optional visual
        </p>
        <h2>
          Give it an <b>image.</b>
        </h2>
        <div className={styles.grid}>
          <label className={styles.wide}>
            <span>HTTPS image URL</span>
            <input {...field("imageUrl")} placeholder="https://…" type="url" />
            <FormFeedback
              form={form}
              name="imageUrl"
              id={field.errorId("imageUrl")}
            />
          </label>
        </div>
      </section>
      <div className={styles.actions}>
        <Link
          href={
            initialEvent ? `/organizer/events/${initialEvent.id}` : "/organizer"
          }
        >
          Cancel
        </Link>
        <button
          className="button button-primary"
          disabled={isSubmitting || (!!initialEvent && !form.formState.isDirty)}
          type="submit"
        >
          {isSubmitting ? (
            <LoaderCircle className={styles.spinner} size={17} />
          ) : (
            <Save size={17} />
          )}{" "}
          {isSubmitting
            ? "Saving…"
            : initialEvent
              ? "Save event details"
              : "Create draft event"}
        </button>
      </div>
    </form>
  );
}
