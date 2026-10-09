import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { AuthForm } from "../auth-form";
import styles from "../auth.module.css";

export const metadata: Metadata = { title: "Create account", description: "Create an EventGate attendee account." };

export default function RegisterPage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main id="main-content" className={styles.page}>
        <section className={styles.intro}><p className="eyebrow"><span /> New attendee</p><h1>Keep your<br /><b>place.</b></h1><p>Create an attendee account once. Then EventGate can reserve your ticket and keep your entry details in one place.</p></section>
        <section className={styles.panel}><div className={styles.panelInner}><h2>Create account.</h2><p>Your account is for attending events. Organiser tools have their own workspace later.</p><AuthForm mode="register" /></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
