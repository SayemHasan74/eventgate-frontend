import type { Metadata } from "next";
import featureStyles from "@/components/auth-styles.module.css";

import { AuthForm } from "../auth-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to reserve EventGate tickets.",
};

export default function SignInPage() {
  return (
    <>
      <main
        id="main-content"
        className={[featureStyles["auth-page"]].join(" ")}
      >
        <section className={[featureStyles["auth-intro"]].join(" ")}>
          <p className="eyebrow">
            <span /> EventGate access
          </p>
          <h1>
            Back to the
            <br />
            <b>room.</b>
          </h1>
          <p>
            One secure sign-in for attendees, organizers, and platform
            administrators. Your account opens the workspace that matches your
            role.
          </p>
        </section>
        <section className={[featureStyles["auth-panel"]].join(" ")}>
          <div className={[featureStyles["auth-panel-inner"]].join(" ")}>
            <h2>Welcome back.</h2>
            <p>
              Use your EventGate account. Attendees manage tickets, organizers
              run events, and admins oversee the platform.
            </p>
            <AuthForm mode="sign-in" />
          </div>
        </section>
      </main>
    </>
  );
}
