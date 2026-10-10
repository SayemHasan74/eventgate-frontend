"use client";

import { useQueries } from "@tanstack/react-query";
import { Activity, ArrowRight, BadgeDollarSign, ShieldCheck, Ticket, UsersRound } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { AdminReportApiError, getAuditLogs, getOperations, getPlatformStats } from "@/lib/admin-report-api";

import styles from "./admin.module.css";

const money = (paisa: number) => `৳${new Intl.NumberFormat("en-BD").format(paisa / 100)}`;
const date = (value: string) => new Intl.DateTimeFormat("en-BD", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(value));
const count = (items: Array<{ status?: string; role?: string; _count: { _all: number } }>, key: "status" | "role", value: string) => items.find((item) => item[key] === value)?._count._all ?? 0;

export function AdminDashboard() {
  const { isReady, session } = useAuth();
  const allowed = session?.user.role === "ADMIN";
  const [statsQuery, operationsQuery, auditQuery] = useQueries({ queries: [
    { queryKey: ["admin-stats", session?.accessToken], queryFn: () => getPlatformStats(session!.accessToken), enabled: isReady && allowed, retry: false },
    { queryKey: ["admin-operations", session?.accessToken], queryFn: () => getOperations(session!.accessToken), enabled: isReady && allowed, retry: false },
    { queryKey: ["admin-audit", session?.accessToken], queryFn: () => getAuditLogs(session!.accessToken), enabled: isReady && allowed, retry: false },
  ] });
  if (!isReady) return <p className={styles.loading}>Loading platform operations…</p>;
  if (!session || !allowed) return <section className={styles.gate}><ShieldCheck size={30} aria-hidden="true" /><h1>Admin access required.</h1><p>Platform reporting is available to EventGate administrators only.</p><Link className="button button-primary" href="/account">My account <ArrowRight size={16} /></Link></section>;
  if (statsQuery.isLoading || operationsQuery.isLoading || auditQuery.isLoading) return <p className={styles.loading}>Loading platform operations…</p>;
  const problem = statsQuery.error ?? operationsQuery.error ?? auditQuery.error;
  if (problem || !statsQuery.data || !operationsQuery.data || !auditQuery.data) return <section className={styles.gate}><Activity size={30} aria-hidden="true" /><h1>Reports unavailable.</h1><p>{problem instanceof AdminReportApiError ? problem.message : "Platform reports could not be loaded."}</p><Link className="button button-primary" href="/admin/refunds">Open refund desk <ArrowRight size={16} /></Link></section>;
  const stats = statsQuery.data;
  const paidRevenue = stats.orders.find((row) => row.status === "PAID")?._sum?.totalAmountPaisaSnapshot ?? 0;
  return <div className={styles.dashboard}>
    <header><p className="eyebrow"><span /> Platform administration</p><h1>Control <b>room.</b></h1><p>Live operations data from events, payments, refunds, and the EventGate audit trail.</p><Link className="button button-primary" href="/admin/refunds">Review refunds <ArrowRight size={16} /></Link></header>
    <section className={styles.metrics}><div><UsersRound size={20} /><span>Registered users</span><strong>{stats.users.reduce((sum, row) => sum + row._count._all, 0)}</strong></div><div><Ticket size={20} /><span>Published events</span><strong>{count(stats.events, "status", "PUBLISHED")}</strong></div><div><BadgeDollarSign size={20} /><span>Paid revenue</span><strong>{money(paidRevenue)}</strong></div><div><Activity size={20} /><span>Refunds waiting</span><strong>{count(stats.refunds, "status", "REQUESTED")}</strong></div></section>
    <section className={styles.section}><div className={styles.heading}><div><p className="eyebrow"><span /> Transaction watch</p><h2>Recent <b>activity.</b></h2></div><span>{operationsQuery.data.payments.length} payments tracked</span></div><div className={styles.activity}>{operationsQuery.data.payments.slice(0, 6).map((payment) => <article key={payment.id}><div><span className={styles.status}>{payment.status}</span><h3>Order {payment.orderId.slice(0, 8).toUpperCase()}</h3><p>{date(payment.initiatedAt)}</p></div><strong>{money(payment.amountPaisa)}</strong></article>)}</div></section>
    <section className={styles.section}><div className={styles.heading}><div><p className="eyebrow"><span /> Audit trail</p><h2>Latest <b>actions.</b></h2></div><span>{auditQuery.data.total} entries</span></div><div className={styles.audit}>{auditQuery.data.logs.map((log) => <article key={log.id}><span>{log.action.replaceAll("_", " ")}</span><p>{log.actor?.displayName ?? "System"} · {log.entityType} · {date(log.createdAt)}</p></article>)}</div></section>
  </div>;
}
