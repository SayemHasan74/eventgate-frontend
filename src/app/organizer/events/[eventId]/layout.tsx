import { EventTabs } from "@/components/event-tabs";
export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <>
      <EventTabs eventId={eventId} />
      {children}
    </>
  );
}
