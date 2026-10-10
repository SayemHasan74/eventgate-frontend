"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Check, LoaderCircle, Plus, Ticket } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import { createTicketTier, getManagedEvents, OrganizerApiError, type TicketTier } from "@/lib/organizer-api";

import styles from "./tier-form.module.css";

const money = (paisa: number) => `৳${new Intl.NumberFormat("en-BD").format(paisa / 100)}`;

export function TierForm() {
  const { isReady, session } = useAuth();
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTiers, setCreatedTiers] = useState<TicketTier[]>([]);
  const allowed = session?.user.role === "ORGANIZER" || session?.user.role === "ADMIN";
  const eventsQuery = useQuery({ queryKey: ["managed-events", session?.accessToken], queryFn: () => getManagedEvents(session!.accessToken), enabled: isReady && Boolean(session) && allowed, retry: false });
  const event = eventsQuery.data?.find((candidate) => candidate.id === eventId);

  const addTier = async (formData: FormData) => {
    const salesStartAt = String(formData.get("salesStartAt") ?? "");
    const salesEndAt = String(formData.get("salesEndAt") ?? "");
    const eventStartsAt = event ? new Date(event.startAt).getTime() : 0;
    if (new Date(salesEndAt).getTime() <= new Date(salesStartAt).getTime() || new Date(salesEndAt).getTime() > eventStartsAt) {
      toast.error("Sales must end after they start and no later than the event start.");
      return;
    }
    if (!session || !event) return;
    setIsSubmitting(true);
    try {
      const tier = await createTicketTier(session.accessToken, event.id, {
        name: String(formData.get("name") ?? "").trim(),
        pricePaisa: Math.round(Number(formData.get("price") ?? 0) * 100),
        capacity: Number(formData.get("capacity") ?? 0),
        salesStartAt: new Date(salesStartAt).toISOString(),
        salesEndAt: new Date(salesEndAt).toISOString(),
      });
      setCreatedTiers((tiers) => [...tiers, tier]);
      toast.success(`${tier.name} tier created.`);
      (document.getElementById("tier-form") as HTMLFormElement | null)?.reset();
    } catch (error) {
      toast.error(error instanceof OrganizerApiError ? error.message : "Your ticket tier could not be created.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady || eventsQuery.isLoading) return <p className={styles.loading}>Loading event workspace…</p>;
  if (!session || !allowed) return <section className={styles.gate}><h1>Organizer access required.</h1><p>Only organizer accounts can create ticket tiers.</p><Link className="button button-primary" href="/organizer">Organizer workspace <ArrowRight size={16} /></Link></section>;
  if (!event) return <section className={styles.gate}><h1>Event not found.</h1><p>This event is not available in your organizer workspace.</p><Link className="button button-primary" href="/organizer">Back to events <ArrowRight size={16} /></Link></section>;
  if (event.status !== "DRAFT") return <section className={styles.gate}><h1>This event is locked.</h1><p>Ticket tiers can only be changed while an event is still a draft.</p><Link className="button button-primary" href="/organizer">Back to events <ArrowRight size={16} /></Link></section>;

  return <div className={styles.workspace}>
    <header className={styles.eventStrip}><div><p className="eyebrow"><span /> Draft event</p><h1>{event.title}</h1></div><div><span><CalendarDays size={15} /> {new Intl.DateTimeFormat("en-BD", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(event.startAt))}</span><span>{event.venue}, {event.city}</span></div></header>
    <div className={styles.grid}>
      <section><p className="eyebrow"><span /> Ticket inventory</p><h2>Build the <b>door.</b></h2><p className={styles.intro}>Each tier has its own capacity, price, and sales window. Add every tier before publishing this event.</p>
        <form action={addTier} className={styles.form} id="tier-form"><label><span>Tier name</span><input maxLength={100} minLength={2} name="name" placeholder="General admission" required /></label><label><span>Price (BDT)</span><input min="0.01" name="price" placeholder="500" required step="0.01" type="number" /></label><label><span>Capacity</span><input min="1" name="capacity" placeholder="100" required type="number" /></label><label><span>Sales start</span><input name="salesStartAt" required type="datetime-local" /></label><label><span>Sales end</span><input name="salesEndAt" required type="datetime-local" /></label><button className="button button-primary" disabled={isSubmitting} type="submit">{isSubmitting ? <LoaderCircle className={styles.spinner} size={17} /> : <Plus size={17} />} {isSubmitting ? "Adding tier" : "Add ticket tier"}</button></form>
      </section>
      <aside className={styles.created}><div><Ticket size={21} aria-hidden="true" /><span>Created this session</span></div>{createdTiers.length === 0 ? <p>New tiers will appear here immediately after the backend saves them.</p> : <><ul>{createdTiers.map((tier) => <li key={tier.id}><Check size={16} aria-hidden="true" /><div><strong>{tier.name}</strong><span>{tier.capacity} capacity · {money(tier.pricePaisa)}</span></div></li>)}</ul><Link className="button button-primary" href={`/organizer/events/${event.id}/publish`}>Review before publishing <ArrowRight size={15} /></Link></>}</aside>
    </div>
  </div>;
}
