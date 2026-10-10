"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, LoaderCircle, MapPin, Send, Ticket } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import { getManagedEvents, OrganizerApiError, publishManagedEvent } from "@/lib/organizer-api";

import styles from "./publish-review.module.css";

const date = (value: string) => new Intl.DateTimeFormat("en-BD", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(value));

export function PublishReview() {
  const { isReady, session } = useAuth();
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const allowed = session?.user.role === "ORGANIZER" || session?.user.role === "ADMIN";
  const eventsQuery = useQuery({ queryKey: ["managed-events", session?.accessToken], queryFn: () => getManagedEvents(session!.accessToken), enabled: isReady && Boolean(session) && allowed, retry: false });
  const event = eventsQuery.data?.find((candidate) => candidate.id === eventId);

  const publish = async () => {
    if (!session || !event || !confirmed) return;
    setIsPublishing(true);
    try {
      const published = await publishManagedEvent(session.accessToken, event.id);
      toast.success("Event published and available to attendees.");
      router.push(`/events/${published.slug}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof OrganizerApiError ? error.message : "Your event could not be published.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isReady || eventsQuery.isLoading) return <p className={styles.loading}>Loading publish review…</p>;
  if (!session || !allowed) return <section className={styles.gate}><h1>Organizer access required.</h1><p>Only organizers can publish an event.</p><Link className="button button-primary" href="/organizer">Organizer workspace</Link></section>;
  if (!event) return <section className={styles.gate}><h1>Event not found.</h1><p>This event is not available in your organizer workspace.</p><Link className="button button-primary" href="/organizer">Back to events</Link></section>;
  if (event.status === "PUBLISHED") return <section className={styles.gate}><CheckCircle2 size={29} aria-hidden="true" /><h1>Already published.</h1><p>This event is public and available to attendees.</p><Link className="button button-primary" href={`/events/${event.slug}`}>View public event</Link></section>;
  if (event.status !== "DRAFT") return <section className={styles.gate}><h1>This event cannot publish.</h1><p>Only future draft events can be published.</p><Link className="button button-primary" href="/organizer">Back to events</Link></section>;

  return <section className={styles.review}>
    <header><p className="eyebrow"><span /> Final review</p><h1>Open the <b>doors.</b></h1><p>Publishing makes this event visible in EventGate discovery. The backend will confirm it has active ticket tiers before it goes live.</p></header>
    <div className={styles.ticket}><div className={styles.ticketMain}><span>EventGate event</span><h2>{event.title}</h2><p>{event.description}</p><dl><div><dt><CalendarDays size={15} /> When</dt><dd>{date(event.startAt)}</dd></div><div><dt><MapPin size={15} /> Where</dt><dd>{event.venue}, {event.city}</dd></div></dl></div><aside><Ticket size={27} aria-hidden="true" /><span>Draft</span></aside></div>
    <label className={styles.confirm}><input checked={confirmed} onChange={(input) => setConfirmed(input.target.checked)} type="checkbox" /><span>I have reviewed the event details and ticket tiers. I understand this will make the event public.</span></label>
    <div className={styles.actions}><Link href={`/organizer/events/${event.id}/tickets`}>Back to ticket tiers</Link><button className="button button-primary" disabled={!confirmed || isPublishing} onClick={publish} type="button">{isPublishing ? <LoaderCircle className={styles.spinner} size={17} /> : <Send size={17} />} {isPublishing ? "Publishing event" : "Publish event"}</button></div>
  </section>;
}
