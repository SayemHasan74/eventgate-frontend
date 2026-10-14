import type { Metadata } from "next";
import { EventPageContent, eventMetadata, type EventPageProps } from "@/app/(public)/events/[slug]/page";

export async function generateMetadata(props: EventPageProps): Promise<Metadata> {
  const result = await eventMetadata(props, true);
  return { ...result, robots: { index: false, follow: false } };
}

export default function DemoEventPage(props: EventPageProps) {
  return <EventPageContent {...props} isDemo />;
}
