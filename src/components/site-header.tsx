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
  const { session } = useAuth();
  const workspace =
    session?.user.role === "ADMIN"
      ? "/admin"
      : session?.user.role === "ORGANIZER"
        ? "/organizer"
        : "/account";
  return (
    <>
      <Link href="/events">Browse events</Link>
      <Link href="/#how-it-works">How it works</Link>
      <OrganizerLink />
      <Link href={session ? workspace : "/auth/sign-in"}>
        {session ? "My workspace" : "Sign in"}
      </Link>
      {session && <LogoutButton />}
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
