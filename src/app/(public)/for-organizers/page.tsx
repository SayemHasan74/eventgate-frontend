import type { Metadata } from "next";
import Link from "next/link";
import { OrganizerLink } from "@/components/organizer-link";
import styles from "./organizers.module.css";
export const metadata: Metadata = {
  title: "For organizers",
  description: "How organizer access and event management work on EventGate.",
};
export default function ForOrganizersPage() {
  return (
    <main id="main-content" className={`wrap ${styles.page}`}>
      <header>
        <p className="eyebrow">
          <span /> Behind the event
        </p>
        <h1>
          Your event.
          <br />
          <b>Your workspace.</b>
        </h1>
        <p>
          Save an event as a draft, build ticket inventory, and review the
          details before opening sales.
        </p>
      </header>
      <section className={styles.panel}>
        <h2>Organizer access is assigned by an administrator</h2>
        <p>
          Creating an account gives you attendee access. A platform
          administrator must assign the organizer role before you can manage
          events. There is no organizer application or automatic approval
          workflow on this website.
        </p>
        <p>
          If you need organizer access, contact the administrator responsible
          for your EventGate account.
        </p>
        <div className={styles.actions}>
          <Link className="button button-primary" href="/auth/sign-in">
            Sign in
          </Link>
          <OrganizerLink workspaceOnly className="button">
            Open organizer workspace
          </OrganizerLink>
        </div>
      </section>
      <section className={styles.grid}>
        {[
          {
            title: "Build a draft",
            text: "Add dates, location, description and an optional HTTPS cover image. Draft previews stay private.",
          },
          {
            title: "Manage ticket sales",
            text: "Set tiers, stock and sales windows. Published tiers have protected fields; pause or close sales without rewriting order history.",
          },
          {
            title: "Run the event",
            text: "Review orders and attendance, use the check-in desk, and inspect reports. Cancelling an eligible event queues refund processing.",
          },
        ].map((item) => (
          <article className={styles.panel} key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>
      <Link href="/events" className="text-link">
        Browse published events →
      </Link>
    </main>
  );
}
