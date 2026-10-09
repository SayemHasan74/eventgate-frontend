import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { AuthForm } from "../auth-form";
import styles from "../auth.module.css";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to reserve EventGate tickets." };

export default function SignInPage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main id="main-content" className={styles.page}>
        <section className={styles.intro}><p className="eyebrow"><span /> Attendee access</p><h1>Your next<br /><b>entry.</b></h1><p>Sign in to reserve an available ticket, complete payment, and keep your event passes together.</p></section>
        <section className={styles.panel}><div className={styles.panelInner}><h2>Welcome back.</h2><p>Use the attendee account connected to your EventGate tickets.</p><AuthForm mode="sign-in" /></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
