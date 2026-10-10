"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, MapPin, QrCode, RotateCcw, Ticket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { getTicket, getTicketQr, TicketApiError } from "@/lib/ticket-api";

import styles from "./ticket-pass.module.css";

const date = (value: string) => new Intl.DateTimeFormat("en-BD", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(value));
const time = (value: string) => new Intl.DateTimeFormat("en-BD", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(value));

export function TicketPass() {
  const { isReady, session } = useAuth();
  const { ticketId } = useParams<{ ticketId: string }>();
  const ticketQuery = useQuery({ queryKey: ["ticket", ticketId, session?.accessToken], queryFn: () => getTicket(session!.accessToken, ticketId), enabled: isReady && Boolean(session?.user.role === "ATTENDEE"), retry: false });
  const qrQuery = useQuery({ queryKey: ["ticket-qr", ticketId, session?.accessToken], queryFn: () => getTicketQr(session!.accessToken, ticketId), enabled: Boolean(ticketQuery.data?.status === "ACTIVE" && session), retry: false, staleTime: Infinity });

  if (!isReady || ticketQuery.isLoading) return <p className={styles.loading}>Opening your pass…</p>;
  if (!session || session.user.role !== "ATTENDEE") return <section className={styles.gate}><Ticket size={28} aria-hidden="true" /><h1>Attendee access required.</h1><p>Event passes are private to the attendee account that owns them.</p><Link className="button button-primary" href="/tickets">My tickets</Link></section>;
  if (ticketQuery.isError || !ticketQuery.data) return <section className={styles.gate}><Ticket size={28} aria-hidden="true" /><h1>Pass unavailable.</h1><p>{ticketQuery.error instanceof TicketApiError ? ticketQuery.error.message : "This pass could not be opened."}</p><Link className="button button-primary" href="/tickets">My tickets</Link></section>;

  const ticket = ticketQuery.data;
  const qrSource = qrQuery.data ? `data:image/svg+xml;utf8,${encodeURIComponent(qrQuery.data)}` : null;
  return <div className={styles.pass}>
    <header><p className="eyebrow"><span /> EventGate attendee pass</p><span className={styles.status}>{ticket.status.replaceAll("_", " ")}</span></header>
    <section className={styles.body}><div className={styles.details}><h1>{ticket.event.title}</h1><p className={styles.tier}>{ticket.ticketTier.name} · Pass #{ticket.sequence}</p><dl><div><dt><CalendarDays size={16} /> Date</dt><dd>{date(ticket.event.startAt)}</dd></div><div><dt><Clock3 size={16} /> Time</dt><dd>{time(ticket.event.startAt)} – {time(ticket.event.endAt)}</dd></div><div><dt><MapPin size={16} /> Venue</dt><dd>{ticket.event.venue}, {ticket.event.city}</dd></div></dl><Link className={styles.manageOrder} href={`/orders/${ticket.orderId}`}><RotateCcw size={16} aria-hidden="true" /> Manage booking &amp; refund <ArrowRight size={16} aria-hidden="true" /></Link></div><aside className={styles.qr}>{ticket.status === "ACTIVE" ? qrQuery.isLoading ? <><QrCode size={42} /><span>Loading QR…</span></> : qrSource ? <><Image alt={`QR pass for ${ticket.event.title}`} height={185} src={qrSource} unoptimized width={185} /><span>Present at entry</span></> : <><QrCode size={42} /><span>QR unavailable</span></> : <><CheckCircle2 size={45} /><strong>{ticket.status === "CHECKED_IN" ? "Checked in" : ticket.status.replaceAll("_", " ")}</strong>{ticket.checkedInAt && <span>{time(ticket.checkedInAt)}</span>}</>}</aside></section>
    <footer><span>Keep this pass private until the event door.</span><span>Ticket ID {ticket.id.slice(0, 8).toUpperCase()}</span></footer>
  </div>;
}
