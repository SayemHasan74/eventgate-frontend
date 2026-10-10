"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, LoaderCircle, ScanLine, Ticket } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import { checkInTicket, getCheckInHistory, getManagedEvents, OrganizerApiError } from "@/lib/organizer-api";

import styles from "./check-in.module.css";

const checkedInTime = (value: string) => new Intl.DateTimeFormat("en-BD", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(value));

export function CheckInDesk() {
  const { isReady, session } = useAuth();
  const { eventId } = useParams<{ eventId: string }>();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const allowed = session?.user.role === "ORGANIZER" || session?.user.role === "ADMIN";
  const eventsQuery = useQuery({ queryKey: ["managed-events", session?.accessToken], queryFn: () => getManagedEvents(session!.accessToken), enabled: isReady && Boolean(session) && allowed, retry: false });
  const historyQuery = useQuery({ queryKey: ["check-ins", eventId, session?.accessToken], queryFn: () => getCheckInHistory(session!.accessToken, eventId), enabled: isReady && Boolean(session) && allowed, retry: false });
  const event = eventsQuery.data?.find((candidate) => candidate.id === eventId);

  const submit = async (formData: FormData) => {
    if (!session) return;
    setIsCheckingIn(true);
    try {
      await checkInTicket(session.accessToken, eventId, String(formData.get("qrToken") ?? "").trim());
      toast.success("Ticket checked in successfully.");
      await historyQuery.refetch();
      (document.getElementById("check-in-form") as HTMLFormElement | null)?.reset();
    } catch (error) {
      toast.error(error instanceof OrganizerApiError ? error.message : "Could not check in this ticket.");
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (!isReady || eventsQuery.isLoading) return <p className={styles.loading}>Opening check-in desk…</p>;
  if (!session || !allowed) return <section className={styles.gate}><ClipboardCheck size={29} aria-hidden="true" /><h1>Organizer access required.</h1><p>Only organizers can check guests in.</p><Link className="button button-primary" href="/organizer">Organizer workspace</Link></section>;
  if (!event) return <section className={styles.gate}><ClipboardCheck size={29} aria-hidden="true" /><h1>Event not found.</h1><p>This event is not available in your workspace.</p><Link className="button button-primary" href="/organizer">Back to events</Link></section>;
  if (event.status !== "PUBLISHED") return <section className={styles.gate}><Ticket size={29} aria-hidden="true" /><h1>Check-in opens after publishing.</h1><p>Publish this event before its guests can be checked in.</p><Link className="button button-primary" href={`/organizer/events/${event.id}/publish`}>Review event</Link></section>;

  const records = historyQuery.data?.records ?? [];
  return <div className={styles.desk}>
    <header><p className="eyebrow"><span /> Live door desk</p><h1>{event.title}</h1><p>Paste an attendee QR token to validate and check them in. Check-in is available only during the backend-controlled event window.</p></header>
    <div className={styles.grid}>
      <section className={styles.scan}><div><ScanLine size={25} aria-hidden="true" /><h2>Check in a <b>guest.</b></h2></div><form action={submit} id="check-in-form"><label><span>QR ticket token</span><input minLength={40} name="qrToken" placeholder="Paste the ticket QR token" required /></label><button className="button button-primary" disabled={isCheckingIn} type="submit">{isCheckingIn ? <LoaderCircle className={styles.spinner} size={17} /> : <CheckCircle2 size={17} />} {isCheckingIn ? "Validating ticket" : "Check in guest"}</button></form></section>
      <aside className={styles.total}><span>Checked in</span><strong>{historyQuery.data?.total ?? "—"}</strong><small>Guests through this door</small></aside>
    </div>
    <section className={styles.history}><div className={styles.historyHeading}><div><p className="eyebrow"><span /> Door log</p><h2>Recent <b>entries.</b></h2></div></div>{historyQuery.isLoading ? <p className={styles.muted}>Loading check-in history…</p> : historyQuery.isError ? <p className={styles.muted}>{historyQuery.error instanceof OrganizerApiError ? historyQuery.error.message : "Check-in history is unavailable."}</p> : records.length === 0 ? <p className={styles.empty}>No guests have been checked in yet.</p> : <ul>{records.map((record) => <li key={record.id}><CheckCircle2 size={18} aria-hidden="true" /><div><strong>{record.attendee.displayName}</strong><span>{record.attendee.email} · {record.ticketTier.name}</span></div><time>{record.checkedInAt ? checkedInTime(record.checkedInAt) : "—"}</time></li>)}</ul>}</section>
  </div>;
}
