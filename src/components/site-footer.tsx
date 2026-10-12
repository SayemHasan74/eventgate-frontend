import Link from "next/link";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={`site-footer wrap ${styles.footer}`}>
      <Link className="brand" href="/">
        <i aria-hidden="true" />
        <span>EventGate</span>
      </Link>
      <p>Find the room. Keep the ticket. Make the moment.</p>
      <nav aria-label="Footer navigation">
        <Link href="/events">Browse events</Link> ·{" "}
        <Link href="/for-organizers">For organizers</Link> ·{" "}
        <Link href="/#how-it-works">How it works</Link>
      </nav>
      <span>© {new Date().getUTCFullYear()} EventGate</span>
    </footer>
  );
}
