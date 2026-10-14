import { TicketsPageContent, type TicketsPageProps } from "@/app/(public)/events/[slug]/tickets/page";

export default function DemoTicketsPage(props: TicketsPageProps) {
  return <TicketsPageContent {...props} isDemo />;
}
