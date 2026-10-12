"use client";
import { invalidateMutation } from "@/lib/query-keys";
import { privateKey } from "@/lib/query-keys";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  Check,
  LoaderCircle,
  Plus,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  FormFeedback,
  useFormFields,
  reportFormError,
} from "@/components/form-feedback";
import { tierFormSchema } from "@/lib/form-schemas";
import { dhakaLocalToUtc, formatMoney, bdtToPaisa } from "@/lib/format";
import { ErrorState } from "@/components/ui/interactive";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import {
  createTicketTier,
  getManagedEvent,
  type TicketTier,
} from "@/lib/organizer-api";

import styles from "./tier-form.module.css";

const money = formatMoney;

export function TierForm() {
  const queryClient = useQueryClient();
  const { isReady, session } = useAuth();
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const [createdTiers, setCreatedTiers] = useState<TicketTier[]>([]);
  const allowed =
    session?.user.role === "ORGANIZER" || session?.user.role === "ADMIN";
  const eventsQuery = useQuery({
    queryKey: privateKey("organizer-events", session?.user.id, eventId, {}),
    queryFn: () => getManagedEvent(eventId),
    enabled: isReady && Boolean(session) && allowed,
    retry: false,
  });
  const event = eventsQuery.data;
  const form = useForm<z.infer<ReturnType<typeof tierFormSchema>>>({
    resolver: zodResolver(tierFormSchema(event?.startAt)),
    defaultValues: {
      name: "",
      price: "",
      capacity: 1,
      salesStartAt: "",
      salesEndAt: "",
    },
  });
  const field = useFormFields(form);
  const isSubmitting = form.formState.isSubmitting;

  const addTier = form.handleSubmit(async (values) => {
    if (!session || !event) return;
    form.clearErrors();
    try {
      const tier = await createTicketTier(event.id, {
        name: values.name,
        pricePaisa: bdtToPaisa(values.price),
        capacity: values.capacity,
        salesStartAt: dhakaLocalToUtc(values.salesStartAt),
        salesEndAt: dhakaLocalToUtc(values.salesEndAt),
      });
      setCreatedTiers((tiers) => [...tiers, tier]);
      form.reset();
      await invalidateMutation(queryClient, session.user.id, "tier");
      toast.success(`${tier.name} tier created.`);
    } catch (error) {
      reportFormError(form, error, { pricePaisa: "price" });
    }
  });

  if (!isReady || eventsQuery.isLoading)
    return <p className={styles.loading}>Loading event workspace…</p>;
  if (!session || !allowed)
    return (
      <section className={styles.gate}>
        <h1>Organizer access required.</h1>
        <p>Only organizer accounts can create ticket tiers.</p>
        <Link className="button button-primary" href="/organizer">
          Organizer workspace <ArrowRight size={16} />
        </Link>
      </section>
    );
  if (eventsQuery.isError)
    return (
      <ErrorState
        message={eventsQuery.error.message}
        retry={() => void eventsQuery.refetch()}
      />
    );
  if (!event)
    return (
      <section className={styles.gate}>
        <h1>Event not found.</h1>
        <p>This event is not available in your organizer workspace.</p>
        <Link className="button button-primary" href="/organizer">
          Back to events <ArrowRight size={16} />
        </Link>
      </section>
    );
  if (event.status !== "DRAFT")
    return (
      <section className={styles.gate}>
        <h1>This event is locked.</h1>
        <p>Ticket tiers can only be changed while an event is still a draft.</p>
        <Link className="button button-primary" href="/organizer">
          Back to events <ArrowRight size={16} />
        </Link>
      </section>
    );

  return (
    <div className={styles.workspace}>
      <header className={styles.eventStrip}>
        <div>
          <p className="eyebrow">
            <span /> Draft event
          </p>
          <h1>{event.title}</h1>
        </div>
        <div>
          <span>
            <CalendarDays size={15} />{" "}
            {new Intl.DateTimeFormat("en-BD", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "Asia/Dhaka",
            }).format(new Date(event.startAt))}
          </span>
          <span>
            {event.venue}, {event.city}
          </span>
        </div>
      </header>
      <div className={styles.grid}>
        <section>
          <p className="eyebrow">
            <span /> Ticket inventory
          </p>
          <h2>
            Build the <b>door.</b>
          </h2>
          <p className={styles.intro}>
            Each tier has its own capacity, price, and sales window. Add every
            tier before publishing this event.
          </p>
          <form
            noValidate
            onSubmit={addTier}
            className={styles.form}
            id="tier-form"
          >
            <FormFeedback form={form} />
            <label>
              <span>Tier name</span>
              <input
                maxLength={100}
                minLength={2}
                {...field("name")}
                placeholder="General admission"
                required
              />
              <FormFeedback
                form={form}
                name="name"
                id={field.errorId("name")}
              />
            </label>
            <label>
              <span>Price (BDT)</span>
              <input
                min="0.01"
                {...field("price")}
                placeholder="500"
                required
                step="0.01"
                type="number"
              />
              <FormFeedback
                form={form}
                name="price"
                id={field.errorId("price")}
              />
            </label>
            <label>
              <span>Capacity</span>
              <input
                min="1"
                {...field("capacity", { valueAsNumber: true })}
                placeholder="100"
                required
                type="number"
              />
              <FormFeedback
                form={form}
                name="capacity"
                id={field.errorId("capacity")}
              />
            </label>
            <label>
              <span>Sales start (Bangladesh, UTC+06:00)</span>
              <input
                {...field("salesStartAt")}
                required
                type="datetime-local"
              />
              <FormFeedback
                form={form}
                name="salesStartAt"
                id={field.errorId("salesStartAt")}
              />
            </label>
            <label>
              <span>Sales end (Bangladesh, UTC+06:00)</span>
              <input {...field("salesEndAt")} required type="datetime-local" />
              <FormFeedback
                form={form}
                name="salesEndAt"
                id={field.errorId("salesEndAt")}
              />
            </label>
            <button
              className="button button-primary"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <LoaderCircle className={styles.spinner} size={17} />
              ) : (
                <Plus size={17} />
              )}{" "}
              {isSubmitting ? "Adding tier" : "Add ticket tier"}
            </button>
          </form>
        </section>
        <aside className={styles.created}>
          <div>
            <Ticket size={21} aria-hidden="true" />
            <span>Created this session</span>
          </div>
          {createdTiers.length === 0 ? (
            <p>
              New tiers will appear here immediately after the backend saves
              them.
            </p>
          ) : (
            <>
              <ul>
                {createdTiers.map((tier) => (
                  <li key={tier.id}>
                    <Check size={16} aria-hidden="true" />
                    <div>
                      <strong>{tier.name}</strong>
                      <span>
                        {tier.capacity} capacity · {money(tier.pricePaisa)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                className="button button-primary"
                href={`/organizer/events/${event.id}/publish`}
              >
                Review before publishing <ArrowRight size={15} />
              </Link>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
