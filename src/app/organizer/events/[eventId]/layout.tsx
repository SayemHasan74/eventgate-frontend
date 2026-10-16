import styles from "@/components/event-theme.module.css";
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
    <div className={styles.theme}>
      <EventTabs eventId={eventId} />
      {children}
    </div>
  );
}
