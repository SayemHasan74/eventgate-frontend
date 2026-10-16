"use client";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "./auth-provider";
import { LogoutButton } from "./logout-button";
import { Button } from "./ui";
import { Modal } from "./ui/interactive";
import { OrganizerLink } from "./organizer-link";
import styles from "./site-header.module.css";
function Navigation() {
  const { session, status, retrySession } = useAuth();
  const signedIn = status === "authenticated" && !!session;
  const workspace =
    session?.user.role === "ADMIN"
      ? "/admin"
      : session?.user.role === "ORGANIZER"
        ? "/organizer"
        : "/account";
  return (
    <>
      <Link href="/events">Browse events</Link>
      {signedIn && session.user.role === "ATTENDEE" && (
        <Link href="/saved-events">Saved events</Link>
      )}
      <Link href="/#how-it-works">How it works</Link>
      <OrganizerLink />
      {signedIn ? (
        <>
          <Link
            className={styles.accountLink}
            href={workspace}
            title={`Signed in as ${session.user.displayName} (${session.user.role.toLowerCase()})`}
          >
            <span>My workspace</span>
            <small>Signed in as {session.user.displayName}</small>
          </Link>
          <LogoutButton />
        </>
      ) : status === "loading" ? (
        <span className={styles.sessionStatus} role="status">
          Checking sign-in…
        </span>
      ) : status === "unavailable" ? (
        <button
          className={styles.sessionRetry}
          type="button"
          onClick={() => void retrySession()}
        >
          Retry sign-in status
        </button>
      ) : (
        <Link href="/auth/sign-in">Sign in</Link>
      )}
    </>
  );
}
function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        className={styles.menuButton}
        aria-expanded={open}
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu size={20} />
      </Button>
      <Modal
        open={open}
        title="EventGate navigation"
        onDismiss={() => setOpen(false)}
        className={styles.drawer}
      >
        <Button aria-label="Close navigation" onClick={() => setOpen(false)}>
          <X size={20} />
        </Button>
        <nav
          className={styles.mobileNav}
          aria-label="Mobile navigation"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          <Navigation />
        </nav>
      </Modal>
    </>
  );
}
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className={styles.header}>
        <Link className="brand" href="/" aria-label="EventGate home">
          <i aria-hidden="true" />
          <span>EventGate</span>
        </Link>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <Navigation />
        </nav>
        <div className={styles.actions}>
          <ThemeToggle />
          <MobileMenu key={pathname} />
        </div>
      </header>
    </>
  );
}
