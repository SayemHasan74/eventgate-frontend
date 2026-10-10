import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to reserve EventGate tickets." };

export default function SignInPage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main id="main-content" className="auth-page">
        <section className="auth-intro"><p className="eyebrow"><span /> EventGate access</p><h1>Back to the<br /><b>room.</b></h1><p>One secure sign-in for attendees, organizers, and platform administrators. Your account opens the workspace that matches your role.</p></section>
        <section className="auth-panel"><div className="auth-panel-inner"><h2>Welcome back.</h2><p>Use your EventGate account. Attendees manage tickets, organizers run events, and admins oversee the platform.</p><AuthForm mode="sign-in" /></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
