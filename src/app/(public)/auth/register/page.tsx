import type { Metadata } from "next";

import { AuthForm } from "../auth-form";
import styles from "@/components/auth-styles.module.css";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an EventGate attendee account.",
};

export default function RegisterPage() {
  return (
    <>
      <main id="main-content" className={styles["auth-page"]}>
        <section className={styles["auth-intro"]}>
          <p className="eyebrow">
            <span /> New attendee
          </p>
          <h1>
            Keep your
            <br />
            <b>place.</b>
          </h1>
          <p>
            Create an attendee account once. Then EventGate can reserve your
            ticket and keep your entry details in one place.
          </p>
        </section>
        <section className={styles["auth-panel"]}>
          <div className={styles["auth-panel-inner"]}>
            <h2>Create account.</h2>
            <p>
              Your account is for attending events. Organiser tools have their
              own workspace later.
            </p>
            <AuthForm mode="register" />
          </div>
        </section>
      </main>
    </>
  );
}
