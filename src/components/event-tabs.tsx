"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Breadcrumbs } from "./ui";
import styles from "./workspace.module.css";
export function EventTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/organizer/events/${eventId}`;
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Events", href: "/organizer/events" },
          { label: "Event workspace" },
        ]}
      />
      <nav className={styles.eventTabs} aria-label="Event tools">
        {[
          ["", "Overview"],
          ["/details", "Details"],
          ["/tickets", "Ticket tiers"],
          ["/orders", "Orders"],
          ["/check-in", "Check-in"],
          ["/reports", "Reports"],
          ["/preview", "Private preview"],
        ].map(([path, label]) => (
          <Link
            key={path}
            href={base + path}
            aria-current={pathname === base + path ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
