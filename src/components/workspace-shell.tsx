"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import type { AuthUser } from "@/lib/auth-types";
import { ThemeToggle } from "./theme-toggle";
import { LogoutButton } from "./logout-button";
import { useAuth } from "./auth-provider";
import { Button } from "./ui";
import { Modal } from "./ui/interactive";
import styles from "./workspace.module.css";
const links = {
  ATTENDEE: [
    ["/account", "Overview"],
    ["/orders", "Orders"],
    ["/tickets", "My tickets"],
    ["/refunds", "Refunds"],
  ],
  ORGANIZER: [
    ["/organizer", "Overview"],
    ["/organizer/events", "Events"],
    ["/organizer/events/new", "Create event"],
  ],
  ADMIN: [
    ["/admin", "Overview"],
    ["/admin/users", "Users"],
    ["/admin/events", "Events"],
    ["/admin/payments", "Payments"],
    ["/admin/refunds", "Refund requests"],
    ["/admin/audit-logs", "Audit trail"],
    ["/admin/operations", "Operations"],
    ["/organizer", "Organizer tools"],
  ],
};
function WorkspaceNavigation({
  user,
  pathname,
  close,
}: {
  user: AuthUser;
  pathname: string;
  close?: () => void;
}) {
  return (
    <nav
      className={styles.nav}
      aria-label={`${user.role.toLowerCase()} workspace`}
    >
      {[
        ...links[user.role],
        ["/account/profile", "My profile"],
        ["/events", "Browse events"],
      ].map(([href, label]) => (
        <Link
          key={href}
          href={href}
          onClick={close}
          aria-current={pathname === href ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
function Drawer({ user, pathname }: { user: AuthUser; pathname: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        className={styles.menuButton}
        aria-expanded={open}
        aria-label="Open workspace navigation"
        onClick={() => setOpen(true)}
      >
        <Menu size={20} />
        Menu
      </Button>
      <Modal
        open={open}
        title="Workspace navigation"
        onDismiss={() => setOpen(false)}
        className={styles.drawer}
      >
        <Button
          className={styles.close}
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </Button>
        <WorkspaceNavigation
          user={user}
          pathname={pathname}
          close={() => setOpen(false)}
        />
        <LogoutButton />
      </Modal>
    </>
  );
}
export function WorkspaceShell({
  initialUser,
  children,
}: {
  initialUser: AuthUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { session } = useAuth();
  const user = session?.user ?? initialUser;
  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main-content">
        Skip to workspace
      </a>
      <aside className={styles.sidebar}>
        <Link className="brand" href="/">
          <i aria-hidden="true" />
          EventGate
        </Link>
        <WorkspaceNavigation user={user} pathname={pathname} />
        <div className={styles.identity}>
          <strong>{user.displayName}</strong>
          <small>
            {user.role.toLowerCase()} · {user.email}
          </small>
          <LogoutButton />
        </div>
      </aside>
      <div className={styles.body}>
        <header className={styles.topbar}>
          <div>
            <Drawer key={pathname} user={user} pathname={pathname} />
            <span>{user.role.toLowerCase()} workspace</span>
          </div>
          <div>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
