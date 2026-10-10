"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, ReceiptText, Ticket } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useAuth } from "@/components/auth-provider";
import { getEventOrders, getEventReport, getManagedEvents, OrganizerApiError } from "@/lib/organizer-api";

import styles from "./report-dashboard.module.css";

const money = (paisa: number) => `৳${new Intl.NumberFormat("en-BD").format(paisa / 100)}`;
const dateTime = (value: string) => new Intl.DateTimeFormat("en-BD", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(value));

export function ReportDashboard() {
  const { isReady, session } = useAuth();
  const { eventId } = useParams<{ eventId: string }>();
  const allowed = session?.user.role === "ORGANIZER" || session?.user.role === "ADMIN";
  const eventsQuery = useQuery({ queryKey: ["managed-events", session?.accessToken], queryFn: () => getManagedEvents(session!.accessToken), enabled: isReady && Boolean(session) && allowed, retry: false });
  const reportQuery = useQuery({ queryKey: ["event-report", eventId, session?.accessToken], queryFn: () => getEventReport(session!.accessToken, eventId), enabled: isReady && Boolean(session) && allowed, retry: false });
  const ordersQuery = useQuery({ queryKey: ["event-orders", eventId, session?.accessToken], queryFn: () => getEventOrders(session!.accessToken, eventId), enabled: isReady && Boolean(session) && allowed, retry: false });
  const event = eventsQuery.data?.find((candidate) => candidate.id === eventId);

  if (!isReady || eventsQuery.isLoading) return <p className={styles.loading}>Loading event reports…</p>;
  if (!session || !allowed) return <section className={styles.gate}><BarChart3 size={29} aria-hidden="true" /><h1>Organizer access required.</h1><p>Event reporting is available to its organizer only.</p><Link className="button button-primary" href="/organizer">Organizer workspace</Link></section>;
  if (!event) return <section className={styles.gate}><BarChart3 size={29} aria-hidden="true" /><h1>Event not found.</h1><p>This event is not available in your workspace.</p><Link className="button button-primary" href="/organizer">Back to events</Link></section>;
  if (reportQuery.isLoading || ordersQuery.isLoading) return <p className={styles.loading}>Loading event reports…</p>;
  if (reportQuery.isError || ordersQuery.isError || !reportQuery.data || !ordersQuery.data) return <section className={styles.gate}><BarChart3 size={29} aria-hidden="true" /><h1>Reports unavailable.</h1><p>{reportQuery.error instanceof OrganizerApiError ? reportQuery.error.message : ordersQuery.error instanceof OrganizerApiError ? ordersQuery.error.message : "Event reporting could not be loaded."}</p><Link className="button button-primary" href="/organizer">Back to events</Link></section>;

  const report = reportQuery.data;
  const totalSold = report.tiers.reduce((sum, tier) => sum + tier.soldQuantity, 0);
  const totalCapacity = report.tiers.reduce((sum, tier) => sum + tier.capacity, 0);
  const inventoryChart = report.tiers.map((tier) => ({ name: tier.name, sold: tier.soldQuantity, reserved: tier.reservedQuantity, available: Math.max(0, tier.capacity - tier.soldQuantity - tier.reservedQuantity) }));
  return <div className={styles.dashboard}>
    <header><p className="eyebrow"><span /> Organizer reporting</p><h1>{event.title}</h1><p>Live figures from completed orders, ticket inventory, and event entry records.</p><div className={styles.actions}>{event.status === "PUBLISHED" && <Link className="button button-primary" href={`/organizer/events/${event.id}/check-in`}><ClipboardCheck size={16} /> Open check-in desk</Link>}<Link href="/organizer">All events <ArrowRight size={15} /></Link></div></header>
    <section className={styles.metrics} aria-label="Event statistics"><div><ReceiptText size={20} /><span>Paid revenue</span><strong>{money(report.paidRevenuePaisa)}</strong></div><div><Ticket size={20} /><span>Tickets sold</span><strong>{totalSold}<small> / {totalCapacity}</small></strong></div><div><CheckCircle2 size={20} /><span>Checked in</span><strong>{report.checkedIn}</strong></div><div><BarChart3 size={20} /><span>Paid orders</span><strong>{report.paidOrderCount}</strong></div></section>
    <section className={styles.section}><div className={styles.heading}><div><p className="eyebrow"><span /> Inventory</p><h2>Tier <b>health.</b></h2></div></div><div className={styles.tiers}>{report.tiers.length === 0 ? <p className={styles.muted}>No ticket tiers are available for this event.</p> : report.tiers.map((tier) => { const percentage = tier.capacity ? Math.min(100, ((tier.soldQuantity + tier.reservedQuantity) / tier.capacity) * 100) : 0; return <div className={styles.tier} key={tier.id}><div><strong>{tier.name}</strong><span>{tier.soldQuantity} sold · {tier.reservedQuantity} reserved · {tier.capacity} capacity</span></div><div className={styles.bar}><i style={{ width: `${percentage}%` }} /></div></div>; })}</div></section>
    {inventoryChart.length > 0 && <section className={styles.chartSection} aria-label="Ticket tier inventory chart"><div className={styles.heading}><div><p className="eyebrow"><span /> Visual report</p><h2>Room <b>mix.</b></h2></div></div><div className={styles.chart}><ResponsiveContainer height={280} width="100%"><BarChart data={inventoryChart} margin={{ top: 20, right: 14, left: -20, bottom: 5 }}><XAxis dataKey="name" tick={{ fill: "#20254f", fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fill: "#20254f", fontSize: 11 }} /><Tooltip cursor={{ fill: "rgba(255, 68, 154, .12)" }} /><Bar dataKey="sold" fill="#ff449a" name="Sold" stackId="tickets" /><Bar dataKey="reserved" fill="#3154ff" name="Reserved" stackId="tickets" /><Bar dataKey="available" fill="#d6d2c8" name="Available" stackId="tickets" /></BarChart></ResponsiveContainer></div></section>}
    <section className={styles.section}><div className={styles.heading}><div><p className="eyebrow"><span /> Orders</p><h2>Recent <b>sales.</b></h2></div><span>{ordersQuery.data.length} orders</span></div>{ordersQuery.data.length === 0 ? <p className={styles.muted}>No orders have been created for this event yet.</p> : <div className={styles.orders}>{ordersQuery.data.map((order) => <article key={order.id}><div><span className={styles.status}>{order.status.replaceAll("_", " ")}</span><h3>{order.attendee.displayName}</h3><p>{order.attendee.email} · {order.ticketTier.name} · {order.quantity} {order.quantity === 1 ? "ticket" : "tickets"}</p></div><div><strong>{money(order.totalAmountPaisaSnapshot)}</strong><time>{dateTime(order.createdAt)}</time></div></article>)}</div>}</section>
  </div>;
}
