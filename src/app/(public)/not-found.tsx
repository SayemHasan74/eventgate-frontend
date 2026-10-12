import Link from "next/link";
export default function MissingPublicPage() {
  return (
    <main id="main-content" className="wrap not-found">
      <h1>Page not found</h1>
      <p>This event or page is unavailable.</p>
      <Link className="button button-primary" href="/events">
        Browse events
      </Link>
    </main>
  );
}
