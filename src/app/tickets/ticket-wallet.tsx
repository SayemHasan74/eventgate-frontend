"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, MapPin, Ticket } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { getTickets, TicketApiError } from "@/lib/ticket-api";

import styles from "./tickets.module.css";

const eventDate = (value: string) => new Intl.DateTimeFormat("en-BD", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(value));

export function TicketWallet() {
  const { isReady, session } = useAuth();
  const query = useQuery({ queryKey: ["tickets", session?.accessToken], queryFn: () => getTickets(session!.accessToken), enabled: isReady && Boolean(session?.user.role === "ATTENDEE"), retry: false });
  if (!isReady) return <p className={styles.loading}>Opening your ticket wallet…</p>;
  if (!session) return <section className={styles.gate}><Ticket size={29} aria-hidden="true" /><h1>Sign in to see your tickets.</h1><p>Your event passes are private to your attendee account.</p><Link className="button button-primary" href="/auth/sign-in?next=/tickets">Sign in <ArrowRight size={16} /></Link></section>;
  if (session.user.role !== "ATTENDEE") return <section className={styles.gate}><Ticket size={29} aria-hidden="true" /><h1>Attendee tickets only.</h1><p>Ticket wallet access is available through an attendee account.</p><Link className="button button-primary" href="/account">My account <ArrowRight size={16} /></Link></section>;
  const tickets = query.data ?? [];
  return <div className={styles.wallet}><header><p className="eyebrow"><span /> Attendee wallet</p><h1>Your <b>passes.</b></h1><p>Each active ticket includes a private QR pass for entry. Open it only when you are ready to check in.</p></header>{query.isLoading ? <p className={styles.muted}>Loading tickets…</p> : query.isError ? <p className={styles.muted}>{query.error instanceof TicketApiError ? query.error.message : "Your tickets could not be loaded."}</p> : tickets.length === 0 ? <section className={styles.empty}><Ticket size={28} aria-hidden="true" /><h2>No passes yet.</h2><p>After a successful ticket payment, your event pass will appear here.</p><Link className="button button-primary" href="/events">Browse events <ArrowRight size={16} /></Link></section> : <div className={styles.list}>{tickets.map((ticket) => <Link className={styles.ticketCard} href={`/tickets/${ticket.id}`} key={ticket.id}><div className={styles.date}><strong>{new Intl.DateTimeFormat("en-BD", { day: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(ticket.event.startAt))}</strong><span>{new Intl.DateTimeFormat("en-BD", { month: "short", timeZone: "Asia/Dhaka" }).format(new Date(ticket.event.startAt))}</span></div><div className={styles.ticketMain}><span className={styles.status}>{ticket.status.replaceAll("_", " ")}</span><h2>{ticket.event.title}</h2><p><CalendarDays size={14} /> {eventDate(ticket.event.startAt)} <i /> <MapPin size={14} /> {ticket.event.city}</p></div><aside><span>{ticket.ticketTier.name}</span><Ticket size={25} aria-hidden="true" /><small>Pass #{ticket.sequence}</small></aside></Link>)}</div>}</div>;
}
