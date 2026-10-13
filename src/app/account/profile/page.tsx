import { ProfileEditor } from "./profile-editor";
import { NotificationSettings } from "@/components/notification-settings";
import { EventPreferencesPanel } from "@/components/event-preferences";
export default function ProfilePage() {
  return (
    <>
      <ProfileEditor />
      <EventPreferencesPanel />
      <NotificationSettings />
    </>
  );
}
