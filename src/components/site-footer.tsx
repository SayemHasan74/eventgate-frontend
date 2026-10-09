import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer wrap">
      <Link className="brand" href="/"><i aria-hidden="true" /><span>EventGate</span></Link>
      <p>Find the room. Keep the ticket. Make the moment.</p>
      <span>© 2026 EventGate</span>
    </footer>
  );
}
