import type { Metadata } from "next";
import { EventsPageContent, type EventsPageProps } from "@/app/(public)/events/page";

export const metadata: Metadata = {
  title: "Recruiter demo events",
  description: "Browse EventGate sample events in the isolated recruiter demo catalog.",
  robots: { index: false, follow: false },
};

export default function DemoEventsPage(props: EventsPageProps) {
  return <EventsPageContent {...props} isDemo />;
}
