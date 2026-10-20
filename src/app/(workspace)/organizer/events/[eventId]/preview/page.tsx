import { WorkspaceQuery } from "@/components/workspace-query";
import { managedEventDetailSchema } from "@/lib/organizer-api";
import { EventWorkspace } from "../event-workspace";
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <WorkspaceQuery
      path={`organizer/events/${encodeURIComponent(eventId)}`}
      domain="organizer-events"
      resource={eventId}
      schema={managedEventDetailSchema}
    >
      <EventWorkspace preview />
    </WorkspaceQuery>
  );
}
