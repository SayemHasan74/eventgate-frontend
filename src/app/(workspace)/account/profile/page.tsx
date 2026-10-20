import { WorkspaceQuery } from "@/components/workspace-query";
import { profileSchema } from "@/lib/profile-api";
import { ProfileEditor } from "./profile-editor";
import { NotificationSettings } from "@/components/notification-settings";
import { EventPreferencesPanel } from "@/components/event-preferences";
export default function ProfilePage() {
  return (
    <WorkspaceQuery path="users/me" domain="users" schema={profileSchema}>
      <ProfileEditor />
      <EventPreferencesPanel />
      <NotificationSettings />
    </WorkspaceQuery>
  );
}
