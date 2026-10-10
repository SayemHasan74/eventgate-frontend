"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, LogOut, MapPin, ReceiptText, Ticket, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import { signOut } from "@/lib/auth-api";
import { getOrders, OrderApiError } from "@/lib/order-api";
import { getProfile, ProfileApiError } from "@/lib/profile-api";

import styles from "./account.module.css";

const money = (paisa: number) => `৳${new Intl.NumberFormat("en-BD").format(paisa / 100)}`;

export function AccountDashboard() {
  const { isReady, session, clearSession } = useAuth();
  const router = useRouter();
  const profileQuery = useQuery({ queryKey: ["account-profile", session?.accessToken], queryFn: () => getProfile(session!.accessToken), enabled: isReady && Boolean(session), retry: false });
  const ordersQuery = useQuery({ queryKey: ["account-orders", session?.accessToken], queryFn: () => getOrders(session!.accessToken), enabled: isReady && Boolean(session), retry: false });

  const logout = async () => {
    if (session) await signOut(session.refreshToken);
    clearSession();
    toast.success("You have been signed out.");
    router.push("/");
    router.refresh();
  };

  if (!isReady) return <div className={styles.loading}>Opening your account…</div>;
  if (!session) return <section className={styles.gate}><UserRound size={29} aria-hidden="true" /><h1>Sign in to see your tickets.</h1><p>Your orders and payment details are visible only to your attendee account.</p><Link className="button button-primary" href="/auth/sign-in?next=/account">Sign in <ArrowRight size={16} /></Link></section>;

  const profile = profileQuery.data;
  const orders = ordersQuery.data?.orders ?? [];
  return (
    <div className={styles.dashboard}>
      <header className={styles.hero}>
        <div><p className="eyebrow"><span /> Attendee account</p><h1>Hi, <b>{profile?.displayName ?? session.user.displayName}.</b></h1><p>{profile?.email ?? session.user.email}</p></div>
        <button className={styles.logout} onClick={logout} type="button"><LogOut size={15} /> Sign out</button>
      </header>

      <section className={styles.profile} aria-label="Profile summary">
        <div><UserRound size={20} aria-hidden="true" /><span>Account</span><strong>{profile?.role?.toLowerCase() ?? "attendee"}</strong></div>
        <div><MapPin size={20} aria-hidden="true" /><span>Checkout location</span><strong>{profile?.city && profile.country ? `${profile.city}, ${profile.country}` : "Add this during checkout"}</strong></div>
        <div><Ticket size={20} aria-hidden="true" /><span>Reservations</span><strong>{ordersQuery.data?.meta.total ?? "—"}</strong></div>
      </section>

      <section className={styles.orders} aria-labelledby="orders-heading">
        <div className={styles.ordersHeading}><div><p className="eyebrow"><span /> Your activity</p><h2 id="orders-heading">Your <b>tickets.</b></h2></div><Link href="/events">Browse events <ArrowRight size={16} /></Link></div>
        {ordersQuery.isLoading ? <p className={styles.muted}>Loading reservations…</p> : ordersQuery.isError ? <p className={styles.muted}>{ordersQuery.error instanceof OrderApiError ? ordersQuery.error.message : "Your reservations could not be loaded."}</p> : orders.length === 0 ? (
          <div className={styles.empty}><ReceiptText size={26} aria-hidden="true" /><h3>No reservations yet.</h3><p>When you reserve an event ticket, it will appear here.</p><Link className="button button-primary" href="/events">Find an event <ArrowRight size={16} /></Link></div>
        ) : <div className={styles.orderList}>{orders.map((order) => <Link className={styles.orderCard} href={`/orders/${order.id}`} key={order.id}><div><span className={styles.status}>{order.status.replaceAll("_", " ")}</span><h3>{order.eventNameSnapshot}</h3><p>{order.ticketTierNameSnapshot} · {order.quantity} {order.quantity === 1 ? "ticket" : "tickets"}</p></div><div className={styles.orderAmount}><strong>{money(order.totalAmountPaisaSnapshot)}</strong><ArrowRight size={17} aria-hidden="true" /></div></Link>)}</div>}
      </section>

      {profileQuery.isError && <p className={styles.profileError}>{profileQuery.error instanceof ProfileApiError ? profileQuery.error.message : "Your profile details are unavailable."}</p>}
    </div>
  );
}
